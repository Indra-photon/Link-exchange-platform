import mongoose, {Schema} from 'mongoose'
import { PostPublishStatusEnum, AvailablePostPublishStatus } from '../utils/constants'
import { PostStatusEnum, AvailablePostStatus } from '../utils/constants'

const linkExchangeSchema = new Schema({
    owner :{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    linkexchangewith:{
        // This field should reference another user (may be more than) or entity that the link exchange is with
        type: [Schema.Types.ObjectId],
        ref: 'User',
        default: []
    },
    publishstatus:{
        type: String,
        enum: AvailablePostPublishStatus,
        default: PostPublishStatusEnum.APPLIED
    },
    postsubmission: {
        type: Schema.Types.ObjectId,
        ref: 'PostSubmission',
        required: true
    },
    poststatus:{
        type: String,
        enum: AvailablePostStatus,
        default: PostStatusEnum.OPEN
    },
    like: {
        type: [Schema.Types.ObjectId],
        ref: 'Like',
        default: [],
        number: {
            type: Number,
            default: 0
        }
    },
    type:{
        type: String,
        default: "link_exchange"
    },
    connect:{
        type: [Schema.Types.ObjectId],
        ref: 'Connections',
        default: [],
        number: {
            type: Number,
            default: 0
        }
    },
    messages:{
        type: [Schema.Types.ObjectId],
        ref: 'Message',
        default: []   
    },
    review: {
        type: number,
        default: 5
    },
    title:{
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
    website:{
        type: String,
        required: true      
    },
    guidelines:{
        type: String,
        required: true
    },
    pagetypes: {
        type: String,
        required: true
    },
    tat:{
        type: String,
        required: true  
    },
    notes: {
        type: String,
        default: null
    },
    report:{
        type: [Schema.Types.ObjectId],
        ref: 'Report',
        default: []
    },
    operations : {
        type : Object,
        default: {
            createdAt: Date.now(),
            message: {
                type: String,
                default: "Link exchange created"    
            }
        }
    }

}, {timestamps: true,})

export const LinkExchange = mongoose.model("LinkExchange", linkExchangeSchema)

