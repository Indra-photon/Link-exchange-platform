import mongoose, {Schema} from 'mongoose'
import { PostPublishStatusEnum, AvailablePostPublishStatus } from '../utils/constants'
import { PostStatusEnum, AvailablePostStatus } from '../utils/constants'

const newToolSchema = new Schema({
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    publishstatus: {
        type: String,   
        enum: AvailablePostPublishStatus,
        default: PostPublishStatusEnum.APPLIED
    },
    poststatus: {
        type: String,
        enum: AvailablePostStatus,
        default: PostStatusEnum.OPEN
    },
    like: {
        type: Schema.Types.ObjectId,
        ref: 'Like',
        default: null,
        number: {
            type: Number,
            default: 0
        }
    },
    type: {
        type: String,
        default: "new_tool"
    },
    connect: {
        type: Schema.Types.ObjectId,
        ref: 'Connections',
        default: null,
        number: {
            type: Number,
            default: 0
        }
    },
    title: {
        type: String,
        required: true  
    },
    description: {
        type: String,
        required: true
    },
    toolurl: {
        type: String,
        required: true
    },

}, {timestamps: true,})

export const NewTool = mongoose.model("NewTool", newToolSchema)