import mongoose, {Schema} from 'mongoose'

const likeSchema = new Schema({
    postId: {
        type: Array,
        required: true,
        index: true,
        default: []
    },
    postType: {
        type: String,
        required: true,
        enum: ['link_exchange', 'content_collab', 'new_tool']
    },
    likedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {timestamps: true})

// Compound index to prevent duplicate likes and optimize queries
likeSchema.index({ postId: 1, likedBy: 1 }, { unique: true })
likeSchema.index({ postId: 1 })
likeSchema.index({ likedBy: 1 })

export const Like = mongoose.model("Like", likeSchema)