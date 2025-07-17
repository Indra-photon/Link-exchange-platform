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

export const Message = mongoose.model("Message", messageSchema)