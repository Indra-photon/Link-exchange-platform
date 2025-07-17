import { Apierror } from "../utils/Apierror.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.models.js";

export const verifyJWT = asyncHandler(async(req, _, next) => {
    try {
        // console.log("Cookies:", req.cookies);
        // console.log("Headers:", req.headers);
        // console.log("Auth Header:", req.headers.authorization);
        
        const token = req.cookies?.accessToken || req.headers.authorization?.replace("Bearer ", "")
        // console.log("Token:", token);

        if (!token) {
            throw new Apierror(401, "Unauthorized request")
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if (!user) {
            
            throw new Apierror(401, "Invalid Access Token")
        }
    
        req.user = user;
        next()
    } catch (error) {
        throw new Apierror(401, error?.message || "Invalid access token")
    }
    
})