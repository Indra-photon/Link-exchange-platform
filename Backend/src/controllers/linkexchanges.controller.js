import { asyncHandler } from "../utils/asyncHandler.js";
import { Apierror } from "../utils/Apierror.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { User } from "../models/user.models.js";
import { LinkExchange } from "../models/linkexchanges.models.js";
import { PostSubmission } from "../models/postsubmissions.models.js";
import { PostPublishStatusEnum, AvailablePostPublishStatus } from '../utils/constants.js'
import { PostStatusEnum, AvailablePostStatus } from '../utils/constants.js'
import { AvailableConnectionRequestStatus, ConnectionRequestSchemaEnum } from '../utils/constants.js'
import { submissionlimit } from "../utils/constants.js";

const submitLinkExchange = asyncHandler(async (req, res) => {
    // find the user from the request
    // check if the user exists
    // if the user does not exist, throw an error
    // if the user exists, check if the user has a valid subscription
    // if the user does not have a valid subscription, throw an error
    // if the user has a valid subscription, create a new link exchange submission
    // and add it to the user's post submissions

    const user = await User.findById(req.user._id).select(
        "-password -refreshtoken"
    )
    if (!user) {
        throw new Apierror(404, "User not found");
    }
    // create a new link exchange submission
    const {title, DR, traffic, website, guidelines, pagetypes, tat, notes} = req.body;

    const linkExchangeSubmissions = await PostSubmission.countDocuments({
    submittedBy: user._id,
    postType: 'link_exchange'
    });

    // check if the user is allowed due to subscription
    if (user.subscription.tier === "free" && linkExchangeSubmissions >= submissionlimit.free.linkExchanges) {
        throw new Apierror(403, "You have reached the limit of link exchanges for your free subscription");
    } else if (user.subscription.tier === "premium" && linkExchangeSubmissions >= submissionlimit.premium.linkExchanges) {
        throw new Apierror(403, "You have reached the limit of link exchanges for your premium subscription");
    } else if (user.subscription.tier === "enterprise" && linkExchangeSubmissions >= submissionlimit.enterprise.linkExchanges) {
        throw new Apierror(403, "You have reached the limit of link exchanges for your enterprise subscription");
    }
    

    //post submitted by the user for approval
    const postSubmission = await PostSubmission.create({
        submittedBy: user._id,
        postType: 'link_exchange',
        postdetails: {
            title,
            DR,
            traffic,
            website,
            guidelines,
            pagetypes,
            tat,
            notes
        }
    });
    if (!postSubmission) {
        throw new Apierror(500, "Failed to create post submission");
    }
    // add the post submission to the user's post submissions
    const updatedUser = await User.findByIdAndUpdate(
        user._id,
        { $push: { postsubmission: postSubmission._id } },
        { new: true }
    );
    if (!updatedUser) {
        throw new Apierror(500, "Failed to update user with post submission");
    }

    return res
        .status(200)
        .json(
            new Apiresponse(
                200,
                postSubmission,
                "Post submitted successfully",
            )
        );

})

const getLinkExchanges = asyncHandler(async (req, res) => {
    // find the user from the request
    // check if the user exists
    // if the user does not exist, throw an error   
    // get all link exchanges whose PostPublishStatusEnum is published and the owner is the user
    // if no link exchanges are found, throw an message
    // if link exchanges are found, return them in the response

    const user = await User.findById(req.user._id).select(
        "-password -refreshtoken"
    )
    if (!user) {
        throw new Apierror(404, "User not found, please login again");
    }

    // get all link exchanges whose PostPublishStatusEnum is published and the owner is the user
    const linkExchanges = await LinkExchange.find({ owner: user._id, publishstatus: PostPublishStatusEnum.PUBLISHED })
    .populate("owner", "-password -refreshToken")
    .populate({
        path: "connect",
        select: "requestedBy requestedTo status offer postid acceptedAt",
        populate: {
            path: "requestedBy requestedTo",
            select: "fullname email"
        }
    })

    if (!linkExchanges || linkExchanges.length === 0) {
        // return an empty array if no link exchanges are found
        return res
            .status(200)
            .json(new Apiresponse(200, [], "No link exchanges found"));
    }

    return res
        .status(200)
        .json(new Apiresponse(200, linkExchanges, "Link exchanges fetched successfully"));
});

const getLinkExchangeById = asyncHandler(async (req, res) => {
    // find the user from the request
    // check if the user exists
    // if the user does not exist, throw an error
    // check if the link exchange exists by id
    // if the link exchange does not exist, throw an error
    // if the link exchange exists, check if the user is the owner of the link exchange
    // if the user is not the owner, throw an error
    // if the user is the owner, return the link exchange in the response

    const user = await User.findById(req.user._id).select(
        "-password -refreshtoken"
    )
    if (!user) {
        throw new Apierror(404, "User not found");
    }

    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw new Apierror(400, "Invalid link exchange ID");
    }

    const linkExchange = await LinkExchange.findOne({owner: user._id, _id: id})
    .populate("owner", "-password -refreshToken")
    .populate({
        path: "connect",
        select: "requestedBy requestedTo status offer postid acceptedAt",
        populate: {
            path: "requestedBy requestedTo",
            select: "fullname email"
        }
    })

    if (!linkExchange) {
        throw new Apierror(404, "Link exchange not found");
    }

    return res
        .status(200)
        .json(new Apiresponse(200, linkExchange, "Link exchange fetched successfully"));
});

const updateLinkExchange = asyncHandler(async (req, res) => {
    // find the user from the request
    // check if the user exists
    // if the user does not exist, throw an error
    // get the link exchange by id
    // if the link exchange does not exist, throw an error
    // if the link exchange exists, check if the post is approved
    // if the post is not approved, throw an error
    // if the post is approved, check if the user is the owner of the link exchange
    // if the user is not the owner, throw an error
    // if the user is the owner, submit the link exchange for approval
    
    const user = await User.findById(req.user._id).select(
        "-password -refreshtoken"
    )
    if (!user) {
        throw new Apierror(404, "User not found");
    }
    // Validate the ID parameter first
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw new Apierror(400, "Invalid link exchange ID");
    }

    // get the link exchange by id WITH ownership check
    const linkExchange = await LinkExchange.findOne({
        _id: id,
        owner: user._id
    });
    const postsubmissionid = linkExchange.postsubmission;

    if (!linkExchange) {
        throw new Apierror(404, "Link exchange not found");
    }
    // check if the post is approved
    if (linkExchange.publishstatus !== PostPublishStatusEnum.PUBLISHED) {
        throw new Apierror(400, "Link exchange is not approved yet");
    }
    // check if the user is the owner of the link exchange
    if (linkExchange.owner.toString() !== user._id.toString()) {
        throw new Apierror(403, "You are not the owner of this link exchange");
    }
    // if the user is the owner, proceed to update the link exchange
    // validate the request body
    if (!req.body || Object.keys(req.body).length === 0) {
        throw new Apierror(400, "No data provided to update the link exchange");
    }
    // check if the required fields are present in the request body

    const requiredFields = ['title', 'DR', 'traffic', 'website', 'guidelines', 'pagetypes', 'tat', 'notes'];
    for (const field of requiredFields) {
        if (!req.body[field]) {
            throw new Apierror(400, `Missing required field: ${field}`);
        }
    }
    // if all required fields are present, proceed to submit the link exchange for approval

    // update the link exchange
    const {title, DR, traffic, website, guidelines, pagetypes, tat, notes} = req.body;

    // find the post submission for this link exchange
    const postSubmission = await PostSubmission.findOne({
        _id: postsubmissionid,
        submittedBy: user._id,
        postType: 'link_exchange'   
    });
    if (!postSubmission) {
        throw new Apierror(404, "Post submission not found for this link exchange");
    }
    // update the post submission
    postSubmission.postdetails = {
        title,
        DR,
        traffic,
        website,
        guidelines,
        pagetypes,
        tat,
        notes
    };
    postSubmission.status = PostPublishStatusEnum.APPLIED; // reset status to applied
    postSubmission.processedAt = null; // reset processedAt to null
    postSubmission.adminNotes = ''; // reset admin notes

    // update the link exchange status to applied
    linkExchange.publishstatus = PostPublishStatusEnum.APPLIED; // change publish status to applied
    linkExchange.poststatus = PostStatusEnum.OPEN; // change post status to open
    linkExchange.operations = {
        ...linkExchange.operations,
        message: "Link exchange updated by owner, awaiting approval",
        createdAt: new Date()
    };

    // remove the link exchange from the user's link exchanges
    const removeLinkExchangeFromUser = await User.findByIdAndUpdate(
        user._id,
        { $pull: { linkExchanges: req.params.id } },
        { new: true }
    );
    if (!removeLinkExchangeFromUser) {
        throw new Apierror(500, "Failed to remove link exchange from user");
    }
    try {
        await postSubmission.save();
        res.status(200).json(
            new Apiresponse(200, postSubmission, "Post submitted for uodate successfully")
        );
    } catch (error) {
        throw new Apierror(500, "Failed to update post submission");
    }
    
});

const deleteLinkExchange = asyncHandler(async (req, res) => {
    // find the user from the request
    // check if the user exists
    // if the user does not exist, throw an error
    // get the link exchange by id
    // if the link exchange does not exist, throw an error
    // if the link exchange exists, check if the user is the owner of the link exchange
    // if the user is not the owner, throw an error
    // if the user is the owner, delete the link exchange
    const user = await User.findById(req.user._id).select(
        "-password -refreshtoken"
    )
    if (!user) {
        throw new Apierror(404, "User not found");
    }
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw new Apierror(400, "Invalid link exchange ID");
    }

    const linkExchange = await LinkExchange.findOne({
        _id: id,
        owner: user._id
    });

    if (!linkExchange) {
        throw new Apierror(404, "Link exchange not found or you don't have permission to delete it");
    }
    // if the user is the owner, delete the link exchange
    // first, delete the post submission associated with this link exchange
    const postSubmission = await PostSubmission.findById(linkExchange.postsubmission);
    if (postSubmission) {
        await PostSubmission.findByIdAndDelete(postSubmission._id);
    }
    // then, delete the link exchange
    await LinkExchange.deleteOne({ _id: req.params.id });   
    // remove the link exchange from the user's post submissions
    const removepostsubmissionfromuser = await User.findByIdAndUpdate(
        user._id,
        { $pull: { postsubmission: linkExchange.postsubmission } },
        { new: true }
    ); 
    if (!removepostsubmissionfromuser) {
        throw new Apierror(500, "Failed to remove post submission from user");
    }
    // if the link exchange is successfully deleted, remove it from the user's linkexchanges
    // remove the linkexchange from user's linkexchanges
    const removelinkexchangefromuser = await User.findByIdAndUpdate(
        user._id,
        { $pull: { linkExchanges: req.params.id } },
        { new: true }
    );
    if (!removelinkexchangefromuser) {
        throw new Apierror(500, "Failed to remove link exchange from user");
    }

    // if everything is successful, return a success response
    return res
        .status(200)
        .json(new Apiresponse(200, {}, "Link exchange deleted successfully"));
});

const closeLinkExchange = asyncHandler(async (req, res) => {
    // find the user from the request
    // check if the user exists
    // if the user does not exist, throw an error
    // get the link exchange by id
    // if the link exchange does not exist, throw an error
    // if the link exchange exists, check if the user is the owner of the link exchange
    // if the user is not the owner, throw an error
    // if the user is the owner, close the link exchange by updating its status to closed
    const user = await User.findById(req.user._id).select(
        "-password -refreshtoken"
    )
    if (!user) {
        throw new Apierror(404, "User not found");
    }
    // get the link exchange by id
    const linkExchange = await LinkExchange.findById(req.params.id);
    if (!linkExchange) {
        throw new Apierror(404, "Link exchange not found");
    }
    // check if the user is the owner of the link exchange
    if (linkExchange.owner.toString() !== user._id.toString()) {
        throw new Apierror(403, "You are not the owner of this link exchange");
    }
    // if the user is the owner, close the link exchange
    // check if the link exchange is already closed
    if (linkExchange.poststatus === PostStatusEnum.CLOSED) {
        throw new Apierror(400, "Link exchange is already closed");
    }
    // update the link exchange status to closed
    linkExchange.publishstatus = PostPublishStatusEnum.ARCHIVED; // change publish status to archived
    linkExchange.poststatus = PostStatusEnum.CLOSED; // change post status to closed
    linkExchange.operations = {
        ...linkExchange.operations,
        message: "Link exchange closed by owner",
        createdAt: new Date()
    };

    // update the post submission status to archived
    const postSubmission = await PostSubmission.findById(linkExchange.postsubmission);
    if (!postSubmission) {
        throw new Apierror(404, "Post submission not found for this link exchange");
    }
    postSubmission.status = PostPublishStatusEnum.ARCHIVED; // change post submission status to archived
    postSubmission.processedAt = new Date(); // set processedAt to current date
    postSubmission.adminNotes = "Link exchange closed by owner"; // add admin notes
    try {
        await postSubmission.save();
    } catch (error) {
        throw new Apierror(500, "Failed to update post submission");
    }
    // save the link exchange
    try {
        await linkExchange.save();
    } catch (error) {
        throw new Apierror(500, "Failed to close link exchange");
    }
    
    return res
        .status(200)
        .json(new Apiresponse(200, linkExchange, "Link exchange closed successfully"));
});

export {
    submitLinkExchange,
    getLinkExchanges,
    getLinkExchangeById,
    updateLinkExchange,
    deleteLinkExchange,
    closeLinkExchange,
    addConnectionsToLinkExchange,
};
