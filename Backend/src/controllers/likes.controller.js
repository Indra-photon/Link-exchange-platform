import { asyncHandler } from "../utils/asyncHandler.js";
import { Apierror } from "../utils/Apierror.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { User } from "../models/user.models.js";
import { LinkExchange } from "../models/linkexchanges.models.js";
import { ContentCollab } from "../models/contentcollabs.models.js";
import { NewTool } from "../models/newtools.models.js";
import { Like } from "../models/likes.models.js";
import mongoose from "mongoose";
import { PostStatusEnum, PostPublishStatusEnum } from "../utils/constants.js";

const addLikeToPost = asyncHandler(async (req, res) => {
    // Extracting user ID who wants to like from the request
    // Assuming user ID is stored in req.user._id after authentication find the user
    // if the user does not exist, throw an error
    // Assuming req.body contains postId and postType

    const { postId, postType } = req.body;
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
        throw new Apierror(404, "User not found");
    }
    // Check if the postType is valid
    const validPostTypes = ['link_exchange', 'content_collab', 'new_tool'];
    if (!validPostTypes.includes(postType)) {
        throw new Apierror(400, "Invalid post type");
    }
    // Check if the postId is provided
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
        throw new Apierror(400, "Valid post ID is required");
    }
    // choose the model based on postType
    let model;
    switch (postType) {
        case 'link_exchange':
            model = LinkExchange; // Assuming LinkExchange is imported
            break;
        case 'content_collab':
            model = ContentCollab; // Assuming ContentCollab is imported
            break;
        case 'new_tool':
            model = NewTool; // Assuming NewTool is imported
            break;
        default:
            throw new Apierror(400, "Invalid post type");
    }

    // find the post based on postId and postType
    const post = await model.findOne({
        _id: postId,
        publishstatus: PostPublishStatusEnum.PUBLISHED,,
        poststatus: PostStatusEnum.OPEN     
    });
    if (!post) {
        throw new Apierror(404, "Post not found to add like");
    }

    // Check if the user is trying to like their own post
    if (post.owner.toString() === userId.toString()) {
        throw new Apierror(400, "You cannot like your own post");
    }  
    // Check if the user has already liked this post
    const existingLike = await Like.findOne({
        postId: postId,
        likedBy: userId,
        postType: postType
    });
    if (existingLike) {
        throw new Apierror(400, "You have already liked this post");
    }

    // Create a new like
    const newLike = new Like({
        postId: postId,
        postType: postType,
        likedBy: userId
    });
    // Save the like to the database
    const savelike = await newLike.save();
    if (!savelike) {
        throw new Apierror(500, "Failed to save like");
    }

    // Update the like count in the post
    post.likecount = (post.likecount || 0) + 1;
    // add the like to the post's like array
    post.like.push(savelike._id);
    const updatedPost = await post.save();
    if (!updatedPost) {
        throw new Apierror(500, "Failed to update post with like");
    }

    user.likedTo.push(savelike._id);
    const addliketouser = await user.save();
    // Check if the like was added to the user's likedTo array
    if (!addliketouser) {
        throw new Apierror(500, "Failed to add like to user");
    }
    // Return success response
    return res.status(200).json(
        new Apiresponse(200, {
            like: savelike,
            post: updatedPost
        }, "Like added successfully")
    );

})

// retrieves all users who liked a specific post
const getPostLikes = asyncHandler(async (req, res) => {
    // get the postId and postType from the request body
    // check the request body for postId and postType
    // find the post based on postId and postType
    // return the users who liked the post with their details
    const { postId, postType } = req.params;
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
        throw new Apierror(400, "Valid post ID is required");
    }
    if (!postType || !['link_exchange', 'content_collab', 'new_tool'].includes(postType)) {
        throw new Apierror(400, "Invalid post type");
    }

    // Find likes for the specified post
    const likes = await Like.find({ postId: postId, postType: postType }).populate('likedBy', 'fullname email')

    if (!likes || likes.length === 0) {
        return res.status(404).json(new Apiresponse(200, [], "No likes found for this post"));
    }

    return res.status(200).json(new Apiresponse(200, "Likes retrieved successfully", likes));
})

export {
    addLikeToPost,
    getPostLikes
};