import mongoose, {Schema} from 'mongoose'
import { PostPublishStatusEnum, AvailablePostPublishStatus } from '../utils/constants'

// const postSubmissionSchema = new Schema({
//     submittedBy: {
//         type: Schema.Types.ObjectId,
//         ref: 'User',
//         required: true
//     },
//     status: {
//         type: String,
//         enum: AvailablePostPublishStatus,
//         default: PostPublishStatusEnum.APPLIED
//     },
//     postdetails: {
//         type: Object,
//         required: true,
//         default: {}
//     },
// }, {timestamps: true})



// export const PostSubmission = mongoose.model("PostSubmission", postSubmissionSchema)


const postSubmissionSchema = new Schema({
    submittedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: AvailablePostPublishStatus,
        default: PostPublishStatusEnum.APPLIED
    },
    postType: {
        type: String,
        enum: ['link_exchange', 'content_collab', 'new_tool'],
        required: true
    },
    postdetails: {
        type: Object,
        required: true,
    },
    adminNotes: {
        type: String,
        default: ''
    },
    processedAt: {
        type: Date,
        default: null
    }
}, {timestamps: true})

export const PostSubmission = mongoose.model("PostSubmission", postSubmissionSchema)