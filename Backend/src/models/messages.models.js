import mongoose, {Schema} from 'mongoose'

const messageSchema = new Schema({
    connectionId: {
        type: Schema.Types.ObjectId,
        ref: 'Connections',
        required: true
    },
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    messageType: {
        type: String,
        enum: ["text"],
        default: "text"
    },
    isRead: {
        type: Boolean,
        default: false
    },
    isDelivered: {
        type: Boolean,
        default: false
    },
    readAt: {
        type: Date,
        default: null
    },
    deliveredAt: {
        type: Date,
        default: null
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {timestamps: true})

// Add these methods before export
messageSchema.statics.validateConnection = async function(connectionId, senderId, receiverId) {
    const connection = await mongoose.model('Connections').findOne({
        _id: connectionId,
        status: 'accepted',
        $or: [
            { requestedBy: senderId, requestedTo: receiverId },
            { requestedBy: receiverId, requestedTo: senderId }
        ]
    });
    
    if (!connection) {
        throw new Error('Connection not found, not accepted, or user not authorized');
    }
    
    return connection;
};

// Pre-save validation
messageSchema.pre('save', async function(next) {
    try {
        await this.constructor.validateConnection(
            this.connectionId, 
            this.sender, 
            this.receiver
        );
        next();
    } catch (error) {
        next(error);
    }
});


export const Message = mongoose.model("Message", messageSchema)