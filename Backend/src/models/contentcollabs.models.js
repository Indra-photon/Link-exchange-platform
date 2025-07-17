import mongoose, {Schema} from 'mongoose'
import { PostPublishStatusEnum, AvailablePostPublishStatus } from '../utils/constants'
import { PostStatusEnum, AvailablePostStatus } from '../utils/constants'


const contentCollabsSchema = new Schema({
    owner:{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true  
    },
    //collabwith can reference another user (can be more than one) or entity that the content collaboration is with
    collabwith:{
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: []
    },
    publishstatus : {
        type: String,
        enum: AvailablePostPublishStatus,
        default: PostPublishStatusEnum.APPLIED
    },
    poststatus:{
        type: String,
        enum: AvailablePostStatus,
        default: PostStatusEnum.OPEN
    },
    like:{
        type: Schema.Types.ObjectId,
        ref: 'Like',
        default: null,
        number: {
            type: Number,
            default: 0
        }
    },
    type:{
        type: String,
        default: "content_collab"
    },
    connect:{
        type: Schema.Types.ObjectId,
        ref: 'Connections',
        default: null,
        number: {
            type: Number,
            default: 0
        }
    },
     messages:{
        type: Schema.Types.ObjectId,
        ref: 'Message',
        default: null   
    },
    title:{
        type: String,
        required: true  
    },
    description:{
        type: String,
        required: true
    },
    websitelink:{
        type: String,
        required: true
    },
    DR:{
        type: Number,
        required: true  
    },
    traffic:{
        type: Number,
        required: true  
    },
    timeline:{
        type: String,
        required: true  
    },
    note: {
        type: String,
        default: null
    },
    report :{
        type: Schema.Types.ObjectId,
        ref: 'Report',
        default: null
    },

}, {timestamps: true,})

export const ContentCollab = mongoose.model("ContentCollab", contentCollabsSchema)