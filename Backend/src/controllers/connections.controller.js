import { asyncHandler } from "../utils/asyncHandler.js";
import { Apierror } from "../utils/Apierror.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { User } from "../models/user.models.js";
import { LinkExchange } from "../models/linkexchanges.models.js";
import { ContentCollab } from "../models/contentcollabs.models.js";
import { NewTool } from "../models/newtools.models.js";
import { Connections } from "../models/connections.models.js";
import mongoose from "mongoose";
import {ConnectionRequestSchemaEnum, AvailableConnectionRequestStatus} from "../utils/constants.js";

const addconnectionstoPost = asyncHandler(async (req, res) => {
    // get postid, postType and offer from request body
    // check if postId and postType and offer are provided and postType is valid if not throw an error
    // get userId from req.user._id -- this will be requestedBy
    // if no userId is found throw an error
    // get the owner of the post from the postType and postId
    // if the owner is not found throw an error
    // check if the user is trying to connect with their own post
    // if so, throw an error
    // check if the user is already connected with the owner of the post based on postType and postId and userId from the connections model
    // if so, throw an error
    // create a new connection request with requestedBy, requestedTo, status, offer, post
    // add the connection request to the connections model
    // add the connections id to the user's connectionsTo
    // add the connections id to the post's connect field
    // return success response with connection request details

    // Extracting postId, postType, and offer from the request body
    const { postId, postType, offer } = req.body;
    const userId = req.user._id;
    if (!postId || !postType || !offer) {
        throw new Apierror(400, "postId, postType, and offer are required");
    }
    if (!mongoose.Types.ObjectId.isValid(postId)) {
        throw new Apierror(400, "Invalid post ID format");
    }
    const validPostTypes = ['link_exchange', 'content_collab', 'new_tool'];
    if (!validPostTypes.includes(postType)) {
        throw new Apierror(400, "Invalid post type");
    }

    // get the owner of the post based on postType and postId
    let postModel;
    switch (postType) { 
        case 'link_exchange':
            postModel = LinkExchange 
            break;
        case 'content_collab':
            postModel = ContentCollab
            break;
        case 'new_tool':
            postModel = NewTool
            break;
        default:
            throw new Apierror(400, "Invalid post type");   
    }

    const post = await postModel.findById(postId)
    if (!post) {
        throw new Apierror(404, "Post not found");
    }
    if (post.publishstatus !== 'published' || post.poststatus !== 'OPEN') {
        throw new Apierror(400, "Post is not available for connections");
    }
    const postOwner = post.owner
    
    if (!postOwner) {
        throw new Apierror(404, "Post owner not found");
    }

    // check if the user is trying to connect with their own post
    // if so, throw an error
    if (post.owner._id.toString() === userId.toString()) {
        throw new Apierror(400, "You cannot connect with your own post");
    }
    // check if the user is already connected with the owner of the post
    const existingConnection = await Connections.findOne({
        requestedBy: userId,
        requestedTo: post.owner._id,
        postid: postId,
        status: { $ne: ConnectionRequestSchemaEnum.REJECTED }
    });
    if (existingConnection) {
        throw new Apierror(400, "You are already connected with this user for this post");
    }

    // create a new connection request with requestedBy, requestedTo, status, offer, post
    const newConnection = new Connections({
        requestedBy: userId,
        requestedTo: postOwner,
        status: ConnectionRequestSchemaEnum.PENDING,
        offer: offer,
        postid: postId
    });
    // save the connection request to the database
    const savedConnection = await newConnection.save();
    if(!savedConnection) {
        throw new Apierror(500, "Failed to create connection request");
    }
    // add the connections id to the user's connectionsTo
    const user = await User.findById(userId);
    if (!user) {
        throw new Apierror(404, "User not found");
    }
    user.connectionsTo.push(savedConnection._id);
    const saveduser = await user.save();
    if (!saveduser) {
        throw new Apierror(500, "Failed to update user connections");
    }

    // add the connections id to the post's connect field
    // find the post and update connect 
    
    post.connect.push(savedConnection._id);
    // post.connectCount += 1; // does not need because we will increase this only when owner accepts it
    const updatedPost = await post.save();
    if (!updatedPost) {
        throw new Apierror(500, "Failed to update post with new connection");
    }

    return res
            .status(200)
            .json(new Apiresponse (200, updatedPost, "Post updated with new connection succesfully"))



})

const updateConnectionStatus = asyncHandler(async (req, res) => {
    // Get user from request
    const user = await User.findById(req.user._id).select("-password -refreshToken");
    if (!user) {
        throw new Apierror(404, "User not found");
    }

    // Get connectionId and status from request body
    const { connectionId, status } = req.body;

    // Validate connectionId
    if (!connectionId || !mongoose.Types.ObjectId.isValid(connectionId)) {
        throw new Apierror(400, "Invalid connection ID");
    }

    // Validate status
    if (!status || !Object.values(ConnectionRequestSchemaEnum).includes(status)) {
        throw new Apierror(400, "Invalid status provided");
    }

    // Find the connection request
    const connectionRequest = await Connections.findOne({
        _id: connectionId,
        requestedTo: user._id
    });

    if (!connectionRequest) {
        throw new Apierror(404, "Connection request not found or you don't have permission");
    }

    // Check if the status is pending
    if (connectionRequest.status !== ConnectionRequestSchemaEnum.PENDING) {
        throw new Apierror(400, "Connection request is not pending");
    }

    // Get the post model dynamically based on postId
    const postId = connectionRequest.postid;
    
    // For now, we need to find which model this post belongs to
    // Try each model until we find the post
    let post = null;
    let postModel = null;

    // Try LinkExchange first
    post = await LinkExchange.findOne({ _id: postId, owner: user._id });
    if (post) {
        postModel = LinkExchange;
    } else {
        // Try ContentCollab
        post = await ContentCollab.findOne({ _id: postId, owner: user._id });
        if (post) {
            postModel = ContentCollab;
        } else {
            // Try NewTool
            post = await NewTool.findOne({ _id: postId, owner: user._id });
            if (post) {
                postModel = NewTool;
            }
        }
    }

    if (!post) {
        throw new Apierror(404, "Post not found or you don't have permission");
    }

    // Handle status update
    if (status === ConnectionRequestSchemaEnum.ACCEPTED) {
        connectionRequest.acceptedAt = new Date();
        connectionRequest.status = ConnectionRequestSchemaEnum.ACCEPTED;
        
        try {
            await connectionRequest.save();
            
            // Increment connection count on post
            post.connectCount += 1;
            const savedPost = await post.save();
            
            if (!savedPost) {
                throw new Apierror(500, "Failed to save post with accepted connection");
            }

            // Add connection to user's connectionsTo (if not already there)
            const userAlreadyHasConnection = user.connectionsTo.includes(connectionRequest._id);
            if (!userAlreadyHasConnection) {
                await User.findByIdAndUpdate(
                    user._id,
                    { $push: { connectionsTo: connectionRequest._id } },
                    { new: true }
                );
            }

            return res
                .status(200)
                .json(new Apiresponse(200, {
                    connection: connectionRequest,
                    post: savedPost
                }, "Connection request accepted successfully"));
            
        } catch (error) {
            throw new Apierror(500, "Failed to update connection request status: " + error.message);
        }

    } else if (status === ConnectionRequestSchemaEnum.REJECTED) {
        connectionRequest.status = ConnectionRequestSchemaEnum.REJECTED;
        
        try {
            await connectionRequest.save();
            
            // Remove the connection request from the post's connect array
            post.connect = post.connect.filter(
                conn => conn.toString() !== connectionRequest._id.toString()
            );
            post.connectCount = Math.max(0, post.connectCount - 1); // Ensure it doesn't go below 0
            const savedPost = await post.save();
            
            if (!savedPost) {
                throw new Apierror(500, "Failed to save post with rejected connection");
            }

            // Remove connection from user's connectionsTo
            await User.findByIdAndUpdate(
                user._id,
                { $pull: { connectionsTo: connectionRequest._id } },
                { new: true }
            );

            return res
                .status(200)
                .json(new Apiresponse(200, {
                    connection: connectionRequest,
                    post: savedPost
                }, "Connection request rejected successfully"));
            
        } catch (error) {
            throw new Apierror(500, "Failed to update connection request status: " + error.message);
        }
    }
});


export {
    addconnectionstoPost,
    updateConnectionStatus
}
