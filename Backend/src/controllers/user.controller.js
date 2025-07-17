import { asyncHandler } from "../utils/asyncHandler.js";
import { Apierror } from "../utils/Apierror.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { User } from "../models/user.models.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { sendEmail } from "../utils/nodemailer.js";
import bcrypt from "bcrypt";
import { mailgen, emailVerificationmailgenContent, forgotPasswordmailgenContent } from "../utils/mail.js";
import crypto from 'crypto'
import dotenv from "dotenv";

const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        // Use the expiry times from the database
        return {
            accessToken, 
            refreshToken,
            accessTokenExpiry: user.accessTokenExpiry.toISOString(),
            refreshTokenExpiry: user.refreshTokenExpiry.toISOString()
        };
    } catch (error) {
        throw new Apierror(500, "Something went wrong while generating tokens");
    }
};

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new Apierror(401, "Unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
    
        const user = await User.findById(decodedToken?._id).select("-password");
    
        if (!user) {
            throw new Apierror(401, "Invalid refresh token");
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new Apierror(401, "Refresh token is expired or used");
        }
    
        const options = {
            httpOnly: true,
            secure: true,
            sameSite: "none"  // Add this to match login endpoint
        };
    
        // Updated to get expiry times as well
        const {accessToken, refreshToken: newRefreshToken, accessTokenExpiry, refreshTokenExpiry} = await generateAccessAndRefreshTokens(user._id);
    
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new Apiresponse(
                    200, 
                    {
                        accessToken, 
                        refreshToken: newRefreshToken,
                        accessTokenExpiry,      // Add expiry time
                        refreshTokenExpiry,     // Add expiry time
                        refreshTime: new Date().toISOString() // Add refresh timestamp
                    },
                    "Access token refreshed"
                )
            );
    } catch (error) {
        throw new Apierror(401, error?.message || "Invalid refresh token");
    }
});

const registerUser = asyncHandler(async (req, res) => {
    const { username, email, fullname, password } = req.body;

    // Check if user already exists
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });
    
    if (existedUser) {
        throw new Apierror(409, "User with email or username already exists");
    }

    // Generate verification token (unhashed for email link)
    const unhashedToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token for database storage
    const hashedToken = crypto.createHash("sha256").update(unhashedToken).digest("hex")

    // Create user with default token balance for free tier
    const user = await User.create({
        fullname,
        email,
        password, 
        username: username.toLowerCase(),
        emailVerificationToken: hashedToken,
        emailVerificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Get created user without sensitive information
    const createdUser = await User.findById(user._id).select("-password -refreshToken -emailVerificationToken -forgotPasswordToken");

    if (!createdUser) {
        throw new Apierror(500, "Something went wrong while registering the user");
    }

    // Send verification email
    try {
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${unhashedToken}`;
        const verificationemailgenContent = emailVerificationmailgenContent(createdUser.username, verificationUrl);
        
        await mailgen({
            email: createdUser.email,
            subject: "Verify your email",
            mailgenContent: verificationemailgenContent
        });
    } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
        // Continue with registration but note email sending failed
    }

    return res.status(201).json(
        new Apiresponse(
            201, 
            createdUser, 
            "User registered successfully. Please check your email to verify your account."
        )
    );
});

// const loginUser = asyncHandler(async (req, res) => {
//     console.log("Login attempt started");
//     console.log("Request body:", req.body);
    
//     const {email, password} = req.body;
//     console.log("Email provided:", email);
    
//     if (!email) {
//         console.log("Error: No email provided");
//         throw new Apierror(400, "Email is required");
//     }
    
//     console.log("Looking for user with email:", email);
//     const user = await User.findOne({
//         $or: [{email}]
//     });
    
//     if (!user) {
//         console.log("Error: User not found in database");
//         throw new Apierror(404, "User does not exist");
//     }
//     console.log("User found:", user._id);
    
//     console.log("Verifying password...");
//     const isPasswordValid = await user.isPasswordCorrect(password);
//     console.log("Password validation result:", isPasswordValid);
    
//     if (!isPasswordValid) {
//         console.log("Error: Invalid password");
//         throw new Apierror(401, "Invalid user credentials");
//     }
    
//     console.log("Updating user's lastLoginDate");
//     user.lastLoginDate = new Date();
//     user.loginHistory.push({
//         date: new Date(),
//     });
    
//     try {
//         await user.save({ validateBeforeSave: false });
//         console.log("User login data updated successfully");
//     } catch (error) {
//         console.log("Error updating user login data:", error);
//     }
    
//     console.log("Generating tokens...");
//     try {
//         const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);
//         console.log("Tokens generated successfully");
//         console.log("Access token length:", accessToken?.length);
//         console.log("Refresh token length:", refreshToken?.length);
        
//         const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
        
//         const options = {
//             httpOnly: true,
//             secure: true,
//             sameSite: "none"
//         };
//         console.log("Cookie options:", options);
        
//         console.log("Sending successful response");
//         return res
//             .status(200)
//             .cookie("accessToken", accessToken, options)
//             .cookie("refreshToken", refreshToken, options)
//             .json(
//                 new Apiresponse(
//                     200, 
//                     {
//                         user: loggedInUser,
//                         accessToken,
//                         refreshToken
//                     },
//                     "User logged in successfully"
//                 )
//             );
//     } catch (error) {
//         console.log("Error in token generation or response:", error);
//         throw new Apierror(500, "Something went wrong during login");
//     }
// });

// Logout user

const loginUser = asyncHandler(async (req, res) => {
    console.log("Login attempt started");
    console.log("Request body:", req.body);
    
    const {email, password} = req.body;
    console.log("Email provided:", email);
    
    if (!email) {
        console.log("Error: No email provided");
        throw new Apierror(400, "Email is required");
    }
    
    console.log("Looking for user with email:", email);
    const user = await User.findOne({
        $or: [{email}]
    });
    
    if (!user) {
        console.log("Error: User not found in database");
        throw new Apierror(404, "User does not exist");
    }
    console.log("User found:", user._id);
    
    console.log("Verifying password...");
    const isPasswordValid = await user.isPasswordCorrect(password);
    console.log("Password validation result:", isPasswordValid);
    
    if (!isPasswordValid) {
        console.log("Error: Invalid password");
        throw new Apierror(401, "Invalid user credentials");
    }
    
    console.log("Updating user's lastLoginDate");
    user.lastLoginDate = new Date();
    user.loginHistory.push({
        date: new Date(),
    });
    
    try {
        await user.save({ validateBeforeSave: false });
        console.log("User login data updated successfully");
    } catch (error) {
        console.log("Error updating user login data:", error);
    }
    
    console.log("Generating tokens...");
    try {
        // Updated to get expiry times as well
        const {accessToken, refreshToken, accessTokenExpiry, refreshTokenExpiry} = 
            await generateAccessAndRefreshTokens(user._id);
        
        const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
        
        const options = {
            httpOnly: true,
            secure: true,
            sameSite: "none"
        };
        console.log("Cookie options:", options);
        
        console.log("Sending successful response");
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new Apiresponse(
                    200, 
                    {
                        user: loggedInUser,
                        accessToken,
                        refreshToken,
                        accessTokenExpiry,      // Added expiry time
                        refreshTokenExpiry,     // Added expiry time
                        loginTime: new Date().toISOString() // Added login timestamp
                    },
                    "User logged in successfully"
                )
            );
    } catch (error) {
        console.log("Error in token generation or response:", error);
        throw new Apierror(500, "Something went wrong during login");
    }
});

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    );

    const options = {
        httpOnly: true,
        secure: true,
        sameSite: "none"
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new Apiresponse(200, {}, "User logged out"));
});



// Get current user
const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select(
        "-password -refreshToken"
    );
    
    return res.status(200).json(
        new Apiresponse(200, {
            user,
            tokenInfo: {
                accessTokenExpiry: user.accessTokenExpiry,
                refreshTokenExpiry: user.refreshTokenExpiry
            }
        }, "User data fetched successfully")
    );
});

// Helper function to check if user's access token is expired
const checkUserTokenExpiry = async (userId) => {
    try {
        const user = await User.findById(userId).select('accessTokenExpiry');
        if (!user || !user.accessTokenExpiry) {
            return { expired: true };
        }
        
        const now = new Date();
        const expiryTime = new Date(user.accessTokenExpiry);
        const expired = now > expiryTime;
        
        return {
            expired,
            expiryTime: expiryTime.toISOString(),
            remainingTime: expiryTime - now
        };
    } catch (error) {
        console.error('Error checking token expiry:', error);
        return { expired: true };
    }
};

// Update account details
// const updateAccountDetails = asyncHandler(async(req, res) => {
//     const {username, email, fullName} = req.body;

//     if (!fullName && !email && !username) {
//         throw new Apierror(400, "At least one field is required for update");
//     }

//     const updateFields = {};
//     if (fullName) updateFields.fullName = fullName;
//     if (email) updateFields.email = email;
//     if (username) updateFields.username = username;

//     const user = await User.findByIdAndUpdate(
//         req.user?._id,
//         {
//             $set: updateFields
//         },
//         {new: true}
//     ).select("-password");

//     return res
//         .status(200)
//         .json(new Apiresponse(200, user, "Account details updated successfully"));
// });
const updateAccountDetails = asyncHandler(async(req, res) => {
    const {username, email, fullname} = req.body;

    if (!fullname && !email && !username) {
        throw new Apierror(400, "At least one field is required for update");
    }

    const updateFields = {};
    if (fullname) updateFields.fullname = fullname;
    if (email) updateFields.email = email;
    if (username) updateFields.username = username;

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: updateFields
        },
        {new: true}
    ).select("-password");

    return res
        .status(200)
        .json(new Apiresponse(200, user, "Account details updated successfully"));
});

// Update avatar
const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path;
    
    if (!avatarLocalPath) {
        throw new Apierror(400, "Avatar file is missing");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    
    if (!avatar?.url) {
        throw new Apierror(400, "Error while uploading avatar");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password");

    return res
        .status(200)
        .json(
            new Apiresponse(200, user, "Avatar image updated successfully")
        );
});

// // Character creation
// const createCharacter = asyncHandler(async(req, res) => {
//     const {name, animationStyle} = req.body;
    
//     // Check if user can create a character
//     if (!req.user.canCreateCharacter()) {
//         throw new Apierror(403, "You've reached your character creation limit. Please upgrade your subscription.");
//     }
    
//     // Check if portrait was uploaded
//     if (!req.file?.path) {
//         throw new Apierror(400, "Portrait image is required");
//     }
    
//     // Upload portrait to Cloudinary
//     const portrait = await uploadOnCloudinary(req.file.path);
//     if (!portrait?.url) {
//         throw new Apierror(400, "Error uploading portrait image");
//     }
    
//     // Generate character (placeholder for AI processing)
//     // In a real implementation, you would call Leonardo AI here
//     // For now, we'll just use the same image as a placeholder
//     const characterImage = portrait.url;
    
//     // Estimate file size (this would be more accurate in a real implementation)
//     const estimatedSizeMB = 1.5; // Placeholder value
    
//     // Check if user has enough storage
//     if (!req.user.hasStorageAvailable(estimatedSizeMB)) {
//         throw new Apierror(403, "You've reached your storage limit. Please upgrade your subscription or delete existing characters.");
//     }
    
//     // Create character record
//     const character = await Character.create({
//         name: name || "My Character",
//         userId: req.user._id,
//         originalPortrait: portrait.url,
//         characterImage: characterImage,
//         animationStyle: animationStyle || "cute",
//         sizeMB: estimatedSizeMB,
//         animationSettings: {
//             animations: ["wave"], // Default animation
//             isAnimated: false
//         }
//     });
    
//     // Update user's character tracking
//     await req.user.trackCharacterCreation(estimatedSizeMB);
    
//     // Add character to user's collection
//     await User.findByIdAndUpdate(
//         req.user._id,
//         {
//             $push: { characters: character._id }
//         }
//     );
    
//     return res
//         .status(201)
//         .json(
//             new Apiresponse(201, character, "Character created successfully")
//         );
// });

// // Apply animation to character
// const animateCharacter = asyncHandler(async(req, res) => {
//     const {characterId, animationType} = req.body;
    
//     if (!characterId || !animationType) {
//         throw new Apierror(400, "Character ID and animation type are required");
//     }
    
//     // Find character and check ownership
//     const character = await Character.findById(characterId);
    
//     if (!character) {
//         throw new Apierror(404, "Character not found");
//     }
    
//     if (character.userId.toString() !== req.user._id.toString()) {
//         throw new Apierror(403, "You don't have permission to animate this character");
//     }
    
//     // Check if user has permission to use this animation type
//     if (animationType !== "wave" && !req.user.features.advancedAnimations) {
//         throw new Apierror(403, "This animation type requires a Pro or Business subscription");
//     }
    
//     // Apply animation (placeholder for Kling AI integration)
//     // In a real implementation, you would call Kling AI here
    
//     // Update character with animation settings
//     character.animationSettings.animations.push(animationType);
//     character.animationSettings.isAnimated = true;
//     await character.save();
    
//     return res
//         .status(200)
//         .json(
//             new Apiresponse(200, character, "Animation applied successfully")
//         );
// });

// // Get user's characters
// const getUserCharacters = asyncHandler(async(req, res) => {
//     const characters = await Character.find({userId: req.user._id})
//         .sort({createdAt: -1});
    
//     return res
//         .status(200)
//         .json(
//             new Apiresponse(200, characters, "Characters fetched successfully")
//         );
// });

// // Delete character
// const deleteCharacter = asyncHandler(async(req, res) => {
//     const {characterId} = req.params;
    
//     const character = await Character.findById(characterId);
    
//     if (!character) {
//         throw new Apierror(404, "Character not found");
//     }
    
//     if (character.userId.toString() !== req.user._id.toString()) {
//         throw new Apierror(403, "You don't have permission to delete this character");
//     }
    
//     // Remove from Cloudinary (implement this separately)
//     // For now, just delete the database record
    
//     // Update user's storage used
//     req.user.storage.total -= character.sizeMB;
//     await req.user.save();
    
//     // Remove character from database
//     await character.deleteOne();
    
//     // Remove from user's characters array
//     await User.findByIdAndUpdate(
//         req.user._id,
//         {
//             $pull: { characters: characterId }
//         }
//     );
    
//     return res
//         .status(200)
//         .json(
//             new Apiresponse(200, {}, "Character deleted successfully")
//         );
// });

// Upgrade subscription
const upgradeSubscription = asyncHandler(async(req, res) => {
    const {tier, paymentId, amount} = req.body;
    
    if (!tier || !["pro", "business"].includes(tier)) {
        throw new Apierror(400, "Valid subscription tier is required");
    }
    
    if (!paymentId) {
        throw new Apierror(400, "Payment ID is required");
    }
    
    if (!amount) {
        throw new Apierror(400, "Payment amount is required");
    }
    
    // Process payment (implement payment gateway integration separately)
    // Placeholder for payment verification
    const paymentVerified = true;
    
    if (!paymentVerified) {
        throw new Apierror(400, "Payment verification failed");
    }
    
    // Find user to get current state
    const user = await User.findById(req.user._id);
    
    if (!user) {
        throw new Apierror(404, "User not found");
    }
    
    // Use the model's method to handle subscription upgrade
    const result = await user.purchaseSubscription(tier, paymentId, amount);
    
    if (!result.success) {
        throw new Apierror(400, "Failed to process subscription upgrade");
    }
    
    // Get the updated user
    const updatedUser = await User.findById(user._id)
        .select("-password -refreshToken -emailVerificationToken -forgotPasswordToken");
    
    return res
        .status(200)
        .json(
            new Apiresponse(
                200, 
                {
                    user: updatedUser,
                    subscription: {
                        tier: updatedUser.subscription.tier,
                        expiryDate: updatedUser.subscription.expiryDate,
                        status: updatedUser.subscription.status
                    },
                    tokens: {
                        balance: updatedUser.tokens.balance,
                        maxBalance: updatedUser.tokens.maxBalance,
                        added: result.tokensAdded
                    }
                }, 
                `Subscription upgraded to ${tier} successfully. ${result.tokensAdded} tokens added.`
            )
        );
});

// Request password reset
const requestPasswordReset = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        throw new Apierror(400, "Email is required");
    }

    // Find user and validate
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
        // Security: Still send success response even if email doesn't exist
        return res.status(200).json(
            new Apiresponse(200, {}, "If your email is registered, you will receive a reset link")
        );
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
        return res.status(400).json(
            new Apiresponse(400, {}, "Please verify your email address before requesting a password reset")
        );
    }

    // Generate reset token (unhashed for email link)
    const unhashedToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token for database storage
    const hashedToken = await bcrypt.hash(unhashedToken, 10);

    // Save token to user
    user.forgotPasswordToken = hashedToken;
    user.forgotPasswordTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    try {
        // Create password reset URL
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${unhashedToken}`;
        const resetEmailContent = forgotPasswordmailgenContent(user.username, resetUrl);
        
        await mailgen({
            email: user.email,
            subject: "Reset your password",
            mailgenContent: resetEmailContent
        });

        return res.status(200).json(
            new Apiresponse(200, {}, "Password reset link sent successfully")
        );
    } catch (error) {
        console.log(error);
        
        // Reset the token fields if email sending fails
        user.forgotPasswordToken = undefined;
        user.forgotPasswordTokenExpiry = undefined;
        await user.save();
        
        throw new Apierror(500, "Error sending reset email. Please try again.");
    }
});

// Reset password
const resetForgotPassword = asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        throw new Apierror(400, "All fields are required");
    }

    // Find user with non-expired token
    const users = await User.find({
        forgotPasswordTokenExpiry: { $gt: Date.now() }
    });

    // Find matching token
    let userFound = null;
    for (const user of users) {
        const isValidToken = await bcrypt.compare(token, user.forgotPasswordToken);
        if (isValidToken) {
            userFound = user;
            break;
        }
    }

    if (!userFound) {
        throw new Apierror(400, "Invalid or expired reset token");
    }

    // Verify that email is verified
    if (!userFound.isEmailVerified) {
        throw new Apierror(400, "Your email address must be verified before resetting password");
    }

    // Update password
    userFound.password = newPassword;
    userFound.forgotPasswordToken = undefined;
    userFound.forgotPasswordTokenExpiry = undefined;

    await userFound.save();

    return res.status(200).json(
        new Apiresponse(200, {}, "Password reset successful")
    );
});

const requestEmailVerification = asyncHandler(async (req, res) => {
    // Get user from authenticated request
    const user = req.user;

    try {
        // Check if email is already verified
        if (user.isEmailVerified) {
            return res.status(200).json(
                new Apiresponse(200, {}, "Email is already verified")
            );
        }

        // Generate verification token (unhashed for email link)
        const unhashedToken = crypto.randomBytes(32).toString('hex');
        
        
        // Hash token for database storage
        const hashedToken = crypto.createHash("sha256").update(unhashedToken).digest("hex")
        

        // Update user with new verification token
        user.emailVerificationToken = hashedToken;
        user.emailVerificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        await user.save({ validateBeforeSave: false });

        // Create verification URL
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${unhashedToken}`;

        // Prepare email content
        const verificationEmailContent = emailVerificationmailgenContent(
            user.username, 
            verificationUrl
        );

        // Send verification email
        await mailgen({
            email: user.email,
            subject: "Verify Your Email",
            mailgenContent: verificationEmailContent
        });


        return res.status(200).json(
            new Apiresponse(
                200, 
                {
                    email: user.email // Optional: return email for frontend confirmation
                }, 
                "Verification email sent successfully. Please check your inbox."
            )
        );

    } catch (error) {
        console.error("Email verification request error:", error);
        try {
            user.emailVerificationToken = undefined;
            user.emailVerificationTokenExpiry = undefined;
            await user.save();
        } catch (cleanupError) {
            console.error("Failed to clear verification token:", cleanupError);
        }

        throw new Apierror(
            500, 
            error.message || "Failed to send verification email"
        );
    }
});

// const verifyEmail = asyncHandler(async (req, res) => {
//     const { token } = req.params;
//     console.log(token)
    
//     if (!token) {
//       throw new Apierror(400, "Verification token is required");
//     }
    
//     const hashedToken = crypto.createHash("sha256").update(token).digest("hex")
//     // Find user directly with non-expired token
//     const userFound = await User.findOne({
//         emailVerificationToken: hashedToken,
//         emailVerificationTokenExpiry: {$gt: Date.now()},
//     })
//     console.log(userFound)
  
//     if (!userFound) {
//       throw new Apierror(400, "No pending email verification found");
//     }
  
//     // Verify the token
//     const isValidToken = await bcrypt.compare(token, userFound.emailVerificationToken);
  
//     if (!isValidToken) {
//       throw new Apierror(400, "Invalid verification token");
//     }
    
//     // Update user verification status
//     userFound.isEmailVerified = true;
//     userFound.emailVerificationToken = undefined;
//     userFound.emailVerificationTokenExpiry = undefined;
    
//     await userFound.save();
    
//     return res.status(200).json(
//       new Apiresponse(200, {}, "Email verified successfully")
//     );
//   });

const verifyEmail = asyncHandler(async(req,res) => {
    const { token } = req.params;
    // console.log(`unhashed token: ${token}`)
    if (!token) {
        throw new Apierror(400, "Your token has expired. Request to verify your email again")
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex")
    
    const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationTokenExpiry: {$gt: Date.now()},
    })

    if(!user || user === null){
        throw new Apierror(400, "You are not registered yet. Please sign in")
    }

    user.isEmailVerified = true
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpiry = undefined;

    await user.save({ validateBeforeSave: false })
    

    return res.status(200).json(
        new Apiresponse(
          200, 
          {
            isEmailVerified: true,
            user: {
              email: user.email,
              username: user.username,
              isEmailVerified: user.isEmailVerified
            }
          }, 
          "Email verified successfully"
        )
      );
})

// Export controllers
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    upgradeSubscription,
    requestPasswordReset,
    resetForgotPassword,
    verifyEmail,
    requestEmailVerification
};