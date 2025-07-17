import mongoose, {Schema} from 'mongoose'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { AvailableUserRoles, UserRolesEnum } from '../utils/constants.js'
import { SubscriptionEnum, AvailableSubscription } from '../utils/constants.js'


const userSchema = new Schema({
    fullname: {
        type: String,
        required: true,
        index: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        index: true,
        trim: true
    },
    alternateemail: {
        type: String,
        index: true,
        trim: true
    },
    phoneno: {
        type: String,
        index: true,
        trim: true  
    },
    company: {
        type: String,
        index: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, "Password is required"]
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    role: {
        type: string,
        required: true,
    },
    user_role:{
        type: String,
        enum: AvailableUserRoles,
        default: UserRolesEnum.MEMBER
    },
    about:{
        type: String,
        index: true,
        trim: true
    },
    membersince: {
        type: Date,
        default: Date.now
    },
    socialmedialinks:{
        type: Object,
        default: {"linkedin": "", "github": "", "twitter": "", "facebook": "","others": ""}
    },
    websites:{
        type: [Schema.Types.Object],
        ref: "userWebsites",
        default: []
    },
    linkExchanges:{
        type: [Schema.Types.Object],
        ref: "LinkExchange",
        default: []
    },
    contentCollabs:{
        type: [Schema.Types.Object],
        ref: "ContentCollab",
        default: []
    },
    newTools:{
        type: [Schema.Types.Object],
        ref: "NewTool",
        default: [] 
    },
    likedTo:{
        type: [Schema.Types.Object],
        ref: "Like",
        default: []         
    },
    connectionsTo:{
        type: [Schema.Types.Object],
        ref: "Connections",
        default: []
    },
    messages:{
        type: Schema.Types.Object,
        ref: "Message",
        default: []
    },
    postsubmission:{
        type: [Schema.Types.Object],
        ref: "PostSubmission",
        default: []
    },
    subscription: {
        tier: {
            type: String,
            enum: AvailableSubscription,
            default: SubscriptionEnum.FREE
        },
        status: {
            type: String,
            enum: ["active", "inactive", "cancelled"],
            default: "inactive"
        },
        startDate: {
            type: Date,
            default: Date.now
        },
        endDate: {
            // one month from start date
            type: Date,
            default: function() {
                return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            }
        }
    },
    allpostsid:{
        type: array,
        default: []
    },
    accessToken: {
        type: String
    },
    accessTokenExpiry: {
        type: Date
    },
    refreshToken: {
        type: String
    },
    refreshTokenExpiry: {
        type: Date
    },
    forgotPasswordToken: {
        type: String
    },
    forgotPasswordTokenExpiry: {
        type: Date
    },
    emailverificationToken: {
        type: String
    },
    emailverificationTokenExpiry: {
        type: Date
    }
}, {timestamps: true})

userSchema.pre("save", async function(next) {
    if(!this.isModified("password")) {
        return next()
    }

    this.password = await bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function(password) {
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email
        },
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn: process.env.ACCESS_TOKEN_EXPIRY}
    )
}

userSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email
        },
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn: process.env.REFRESH_TOKEN_EXPIRY}
    )
}

userSchema.methods.generateTemporaryToken = function() {
    const unhashedToken = crypto.randomBytes(20).toString("hex")
    const hashedToken = crypto
        .createHash("sha256")
        .update(unhashedToken)
        .digest("hex")

    const tokenExpiry = Date.now() + (20*60*1000)

    return {hashedToken, unhashedToken, tokenExpiry}
}

export const User = mongoose.model("User", userSchema)