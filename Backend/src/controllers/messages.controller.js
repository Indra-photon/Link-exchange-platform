import { Message } from '../models/messages.models.js'
import { Connections } from '../models/connections.models.js'
import { User } from '../models/users.models.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'

// Send Message
export const sendMessage = asyncHandler(async (req, res) => {
    const { connectionId, content, receiver } = req.body
    const sender = req.user._id

    // Validate connection exists and is accepted
    const connection = await Connections.findOne({
        _id: connectionId,
        status: "accepted",
        $or: [
            { requestedBy: sender, requestedTo: receiver },
            { requestedBy: receiver, requestedTo: sender }
        ]
    })

    if (!connection) {
        throw new ApiError(403, "Connection not found or not accepted")
    }

    // Create message
    const message = await Message.create({
        connectionId,
        sender,
        receiver,
        content,
        messageType: "text",
        timestamp: new Date()
    })

    // Populate sender and receiver details
    const populatedMessage = await Message.findById(message._id)
        .populate('sender', 'fullname email')
        .populate('receiver', 'fullname email')

    // Emit to receiver via socket
    const io = req.app.get('io')
    io.to(receiver.toString()).emit('message:received', {
        message: populatedMessage,
        connectionId
    })

    // Mark as delivered if receiver is online
    const receiverSocket = req.app.get('userSockets')?.[receiver.toString()]
    if (receiverSocket) {
        message.isDelivered = true
        message.deliveredAt = new Date()
        await message.save()

        // Emit delivery confirmation to sender
        io.to(sender.toString()).emit('message:delivered', {
            messageId: message._id,
            deliveredAt: message.deliveredAt
        })
    }

    res.status(201).json(
        new ApiResponse(201, populatedMessage, "Message sent successfully")
    )
})

// Get Messages for a Connection
export const getMessages = asyncHandler(async (req, res) => {
    const { connectionId } = req.params
    const { page = 1, limit = 20, before } = req.query
    const userId = req.user._id

    // Validate user is part of the connection
    const connection = await Connections.findOne({
        _id: connectionId,
        status: "accepted",
        $or: [
            { requestedBy: userId },
            { requestedTo: userId }
        ]
    })

    if (!connection) {
        throw new ApiError(403, "Connection not found or unauthorized")
    }

    // Build query
    const query = { connectionId }
    if (before) {
        query.timestamp = { $lt: new Date(before) }
    }

    // Get messages with pagination
    const messages = await Message.find(query)
        .populate('sender', 'fullname email')
        .populate('receiver', 'fullname email')
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))

    // Reverse to show chronological order
    const reversedMessages = messages.reverse()

    res.status(200).json(
        new ApiResponse(200, reversedMessages, "Messages retrieved successfully")
    )
})

// Mark Messages as Read
export const markMessagesAsRead = asyncHandler(async (req, res) => {
    const { connectionId } = req.params
    const userId = req.user._id

    // Validate connection
    const connection = await Connections.findOne({
        _id: connectionId,
        status: "accepted",
        $or: [
            { requestedBy: userId },
            { requestedTo: userId }
        ]
    })

    if (!connection) {
        throw new ApiError(403, "Connection not found or unauthorized")
    }

    // Mark all unread messages as read
    const result = await Message.updateMany(
        {
            connectionId,
            receiver: userId,
            isRead: false
        },
        {
            $set: {
                isRead: true,
                readAt: new Date()
            }
        }
    )

    // Emit read confirmation to sender
    const io = req.app.get('io')
    const senderId = connection.requestedBy.toString() === userId.toString() 
        ? connection.requestedTo 
        : connection.requestedBy

    io.to(senderId.toString()).emit('messages:read', {
        connectionId,
        readBy: userId,
        readAt: new Date(),
        count: result.modifiedCount
    })

    res.status(200).json(
        new ApiResponse(200, { count: result.modifiedCount }, "Messages marked as read")
    )
})

// Get Conversations List
export const getConversations = asyncHandler(async (req, res) => {
    const userId = req.user._id

    // Get all accepted connections for the user
    const connections = await Connections.find({
        status: "accepted",
        $or: [
            { requestedBy: userId },
            { requestedTo: userId }
        ]
    }).populate('requestedBy requestedTo', 'fullname email')

    // Get last message for each connection
    const conversations = await Promise.all(
        connections.map(async (connection) => {
            const lastMessage = await Message.findOne({
                connectionId: connection._id
            })
            .sort({ timestamp: -1 })
            .populate('sender receiver', 'fullname email')

            const unreadCount = await Message.countDocuments({
                connectionId: connection._id,
                receiver: userId,
                isRead: false
            })

            const otherUser = connection.requestedBy._id.toString() === userId.toString()
                ? connection.requestedTo
                : connection.requestedBy

            return {
                connectionId: connection._id,
                otherUser,
                lastMessage,
                unreadCount,
                updatedAt: lastMessage?.timestamp || connection.updatedAt
            }
        })
    )

    // Sort by last message timestamp
    conversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))

    res.status(200).json(
        new ApiResponse(200, conversations, "Conversations retrieved successfully")
    )
})

// Get Unread Messages Count
export const getUnreadCount = asyncHandler(async (req, res) => {
    const userId = req.user._id

    const unreadCount = await Message.countDocuments({
        receiver: userId,
        isRead: false
    })

    res.status(200).json(
        new ApiResponse(200, { unreadCount }, "Unread count retrieved successfully")
    )
})

// Socket Event Handlers
export const handleSocketEvents = (io) => {
    const userSockets = new Map()

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id)

        // User joins their room
        socket.on('user:join', (userId) => {
            socket.join(userId)
            userSockets.set(userId, socket.id)
            console.log(`User ${userId} joined room`)
        })

        // Typing indicators
        socket.on('typing:start', (data) => {
            socket.to(data.receiver).emit('typing:start', {
                sender: data.sender,
                connectionId: data.connectionId
            })
        })

        socket.on('typing:stop', (data) => {
            socket.to(data.receiver).emit('typing:stop', {
                sender: data.sender,
                connectionId: data.connectionId
            })
        })

        // Message delivery confirmation
        socket.on('message:delivered', async (data) => {
            try {
                await Message.findByIdAndUpdate(data.messageId, {
                    isDelivered: true,
                    deliveredAt: new Date()
                })

                socket.to(data.senderId).emit('message:delivered', {
                    messageId: data.messageId,
                    deliveredAt: new Date()
                })
            } catch (error) {
                console.error('Error updating message delivery:', error)
            }
        })

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id)
            // Remove user from socket map
            for (const [userId, socketId] of userSockets.entries()) {
                if (socketId === socket.id) {
                    userSockets.delete(userId)
                    break
                }
            }
        })
    })

    // Store userSockets in app for access in controllers
    io.userSockets = userSockets
}