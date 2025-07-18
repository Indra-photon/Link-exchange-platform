import mongoose, {Schema} from 'mongoose'
import { ConnectionRequestSchemaEnum, AvailableConnectionRequestStatus } from '../utils/constants'

const connectionsSchema = new Schema({
    requestedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    requestedTo: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: AvailableConnectionRequestStatus,
        default: ConnectionRequestSchemaEnum.PENDING
    },
    offer: {
        type: String,   
        default: ''
    },
    postid: {
        type: String,
        default: '',
        required: true
    },
    acceptedAt: {
        type: Date,
        default: null
    },
    messages:{
        type: Schema.Types.ObjectId,
        ref: 'Message',
        default: null   
    },


}, {timestamps: true})

export const Connections = mongoose.model("Connections", connectionsSchema)