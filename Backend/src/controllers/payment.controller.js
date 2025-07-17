import Razorpay from "razorpay";
import crypto from 'crypto';
import mongoose from "mongoose";

import { Apierror } from "../utils/Apierror.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import { Payment } from "../models/payment.models.js";
import { User } from "../models/user.models.js";

// Initialize Razorpay instance
const razorpay = new Razorpay({ 
    key_id: process.env.RAZORPAY_KEY_ID, 
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create Order for Token Purchase
const createTokenPurchaseOrder = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { 
        tokenCount, 
        amount 
    } = req.body;

    // Validate input
    if (!tokenCount || tokenCount <= 0) {
        throw new Apierror(400, "Invalid token purchase amount");
    }

    try {
        // Verify user can purchase tokens
        const user = await User.findById(userId);
        if (!user) {
            throw new Apierror(404, "User not found");
        }

        // Calculate total amount in paise (Razorpay works in smallest currency unit)
        const amountInPaise = Math.round(amount * 100);

        // Create Razorpay order
        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: "INR",
            receipt: `TOKEN_${userId}_${Date.now()}`,
            notes: {
                userId: userId.toString(),
                tokenCount: tokenCount,
                type: 'token_purchase'
            }
        });

        if (!order || !order.id) {
            throw new Apierror(500, "Failed to create Razorpay order");
        }

        return res.status(200).json(
            new Apiresponse(200, {
                order,
                key: process.env.RAZORPAY_KEY_ID
            }, "Order created successfully")
        );

    } catch (error) {
        console.error("Token purchase order creation error:", error);
        throw new Apierror(500, "Failed to create token purchase order");
    }
});

// Create Order for Subscription Upgrade
// const createSubscriptionUpgradeOrder = asyncHandler(async (req, res) => {
//     const userId = req.user._id;
//     const { 
//         tier, 
//         amount 
//     } = req.body;

//     // Validate input
//     if (!['basic', 'premium'].includes(tier)) {
//         throw new Apierror(400, "Invalid subscription tier");
//     }

//     try {
//         // Verify user
//         const user = await User.findById(userId);
//         if (!user) {
//             throw new Apierror(404, "User not found");
//         }

//         // Calculate total amount in paise
//         const amountInPaise = Math.round(amount * 100);

//         // Create Razorpay order
//         const order = await razorpay.orders.create({
//             amount: amountInPaise,
//             currency: "INR",
//             receipt: `SUB_${userId}_${Date.now()}`,
//             notes: {
//                 userId: userId.toString(),
//                 tier: tier,
//                 previousTier: user.subscription.tier,
//                 type: 'subscription_upgrade'
//             }
//         });

//         if (!order || !order.id) {
//             throw new Apierror(500, "Failed to create Razorpay order");
//         }

//         return res.status(200).json(
//             new Apiresponse(200, {
//                 order,
//                 key: process.env.RAZORPAY_KEY_ID
//             }, "Subscription upgrade order created successfully")
//         );

//     } catch (error) {
//         console.error("Subscription upgrade order creation error:", error);
//         throw new Apierror(500, "Failed to create subscription upgrade order");
//     }
// });

const createSubscriptionUpgradeOrder = async (req, res) => {
    try {
      // DEBUG: Log request data
      console.log('📝 Subscription upgrade request:', {
        body: req.body,
        user: req.user?._id,
        tier: req.body.tier,
        amount: req.body.amount,
        isRenewal: req.body.isRenewal
      });
      
      // Extract data from request
      const { tier, amount, isRenewal = false } = req.body;
      const userId = req.user._id;
      
      // Validate inputs
      if (!tier || !['basic', 'premium'].includes(tier)) {
        console.error('❌ Invalid subscription tier:', tier);
        return res.status(400).json({
          success: false,
          message: 'Invalid subscription tier'
        });
      }
      
      if (!amount || isNaN(amount) || amount <= 0) {
        console.error('❌ Invalid amount:', amount);
        return res.status(400).json({
          success: false,
          message: 'Invalid amount'
        });
      }
      
      // Find user
      const user = await User.findById(userId);
      if (!user) {
        console.error('❌ User not found:', userId);
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // DEBUG: Log user's current subscription
      console.log('👤 User subscription status:', {
        currentTier: user.subscription?.tier,
        status: user.subscription?.status,
        expiryDate: user.subscription?.expiryDate
      });
      
      // Configure Razorpay order
      try {
        // DEBUG: Log Razorpay initialization
        console.log('🔄 Initializing Razorpay order:', {
          amount,
          currency: 'INR',
          receipt: "xyz",
          notes: {
            tier,
            userId: userId.toString(),
            isRenewal: isRenewal.toString()
          }
        });
        
        // Create Razorpay instance
        const instance = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        console.log('BACKEND RAZORPAY CONFIG:', {
        key_id_prefix: process.env.RAZORPAY_KEY_ID.substring(0, 10),
        is_test: process.env.RAZORPAY_KEY_ID.startsWith('rzp_test_'),
        is_live: process.env.RAZORPAY_KEY_ID.startsWith('rzp_live_')
        });
        
        // Create order
        const order = await instance.orders.create({
          amount: amount * 100, // Convert to paise
          currency: 'INR',
          receipt: "xyz",
          notes: {
            tier,
            userId: userId.toString(),
            isRenewal: isRenewal.toString()
          }
        });
        
        // DEBUG: Log successful order creation
        console.log('✅ Razorpay order created:', {
          orderId: order.id,
          amount: order.amount,
          currency: order.currency
        });
        
        return res.status(200).json({
          success: true,
          data: {
            key: process.env.RAZORPAY_KEY_ID,
            order
          },
          message: 'Subscription upgrade order created successfully'
        });
      } catch (razorpayError) {
        // DEBUG: Log detailed Razorpay error
        console.error('❌ Razorpay error:', razorpayError);
        console.error('Error details:', {
          message: razorpayError.message,
          code: razorpayError.code,
          description: razorpayError.description,
          metadata: razorpayError.metadata
        });
        
        return res.status(500).json({
          success: false,
          message: 'Failed to create Razorpay order',
          error: razorpayError.message
        });
      }
    } catch (error) {
      // DEBUG: Log error
      console.error('❌ Subscription upgrade order error:', error);
      console.error('Error stack:', error.stack);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to create subscription upgrade order',
        error: error.message
      });
    }
  };

// Verify Payment
// const verifyPayment = asyncHandler(async (req, res) => {
//     const { 
//         razorpay_order_id, 
//         razorpay_payment_id, 
//         razorpay_signature 
//     } = req.body;

//     const userId = req.user._id;

//     // Start a database transaction
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//         // Verify payment signature
//         const body = razorpay_order_id + "|" + razorpay_payment_id;
//         const expectedSignature = crypto
//             .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//             .update(body.toString())
//             .digest("hex");
        
//         // Check signature authenticity
//         if (expectedSignature !== razorpay_signature) {
//             throw new Apierror(400, "Payment verification failed");
//         }

//         // Fetch the order to get additional details
//         const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);
        
//         // Extract metadata from order notes
//         const { 
//             userId: orderUserId, 
//             type, 
//             tokenCount, 
//             tier, 
//             previousTier 
//         } = razorpayOrder.notes;

//         // Validate user
//         if (orderUserId !== userId.toString()) {
//             throw new Apierror(403, "Unauthorized payment");
//         }

//         // Find user
//         const user = await User.findById(userId);
//         if (!user) {
//             throw new Apierror(404, "User not found");
//         }

//         // Create payment record
//         const payment = await Payment.create([{
//             owner: userId,
//             razorpay_order_id,
//             razorpay_payment_id,
//             razorpay_signature,
//             type,
//             metadata: {
//                 amount: razorpayOrder.amount / 100, // Convert back to rupees
//                 currency: razorpayOrder.currency,
//                 ...(type === 'token_purchase' && { tokensPurchased: tokenCount }),
//                 ...(type === 'subscription_upgrade' && { 
//                     subscriptionTier: tier,
//                     previousTier 
//                 })
//             },
//             status: 'successful',
//             notes: razorpayOrder.notes
//         }], { session });

//         // Process based on payment type
//         if (type === 'token_purchase') {
//             // Add tokens to user's balance
//             await user.purchaseTokens(
//                 parseInt(tokenCount), 
//                 razorpay_payment_id, 
//                 razorpayOrder.amount / 100
//             );
//         } else if (type === 'subscription_upgrade') {
//             // Upgrade subscription
//             await user.purchaseSubscription(
//                 tier, 
//                 razorpay_payment_id, 
//                 razorpayOrder.amount / 100
//             );
//         }

//         // Commit transaction
//         await session.commitTransaction();

//         return res.status(200).json(
//             new Apiresponse(200, { 
//                 paymentId: payment[0]._id,
//                 type 
//             }, "Payment processed successfully")
//         );

//     } catch (error) {
//         // Abort transaction in case of error
//         await session.abortTransaction();
//         console.error("Payment verification error:", error);
//         throw new Apierror(400, "Payment verification failed: " + error.message);
//     } finally {
//         // End session
//         session.endSession();
//     }
// });

const verifyPayment = asyncHandler(async (req, res) => {
    // Log full request body for debugging
    console.log('📝 PAYMENT VERIFICATION - Request body:', JSON.stringify(req.body, null, 2));
    console.log('🔑 User ID from request:', req.user?._id?.toString());

    const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature,
        type: requestType, // Capture the type from request for debugging
        orderType  // Also capture orderType
    } = req.body;

    console.log('🧾 Extracted payment details:', { 
        razorpay_order_id, 
        razorpay_payment_id, 
        requestType,
        orderType
    });

    const userId = req.user._id;

    // Start a database transaction
    console.log('🔄 Starting database transaction');
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Verify payment signature
        console.log('🔐 Verifying payment signature');
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");
        
        console.log('🔍 Signature comparison:', {
            expected: expectedSignature,
            received: razorpay_signature,
            match: expectedSignature === razorpay_signature
        });
        
        // Check signature authenticity
        if (expectedSignature !== razorpay_signature) {
            console.error('❌ Signature verification failed');
            throw new Apierror(400, "Payment verification failed: Invalid signature");
        }

        // Fetch the order to get additional details
        console.log('🔄 Fetching order details from Razorpay:', razorpay_order_id);
        let razorpayOrder;
        try {
            const instance = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET
            });
            razorpayOrder = await instance.orders.fetch(razorpay_order_id);
            console.log('✅ Razorpay order fetched:', {
                id: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                notes: razorpayOrder.notes
            });
        } catch (razorpayError) {
            console.error('❌ Razorpay order fetch error:', razorpayError);
            throw new Apierror(500, "Failed to fetch order details from Razorpay: " + razorpayError.message);
        }
        
        // Extract metadata from order notes
        console.log('📋 Order notes:', razorpayOrder.notes);
        
        // Check if notes exists and has expected fields
        if (!razorpayOrder.notes) {
            console.error('❌ Order notes not found');
            throw new Apierror(400, "Payment verification failed: Order notes not found");
        }
        
        let { 
            userId: orderUserId, 
            type: noteType, 
            tokenCount, 
            tier, 
            previousTier 
        } = razorpayOrder.notes;
        
        // For debugging: if type is missing from notes, use the one from request
        if (!noteType) {
            console.warn('⚠️ Type missing from order notes, using request type instead');
            noteType = requestType || orderType;
            // Update the notes for later use
            razorpayOrder.notes.type = noteType;
        }
        
        console.log('🔑 Payment type information:', {
            fromNotes: noteType,
            fromRequest: requestType,
            fromOrderType: orderType,
            finalType: noteType
        });

        // Validate user
        console.log('👤 Validating user IDs:', {
            fromOrder: orderUserId,
            fromRequest: userId.toString(),
            match: orderUserId === userId.toString()
        });
        
        if (orderUserId !== userId.toString()) {
            console.error('❌ User ID mismatch');
            throw new Apierror(403, "Unauthorized payment: User ID mismatch");
        }

        // Find user
        console.log('🔍 Finding user by ID:', userId);
        const user = await User.findById(userId);
        if (!user) {
            console.error('❌ User not found');
            throw new Apierror(404, "User not found");
        }
        console.log('✅ User found:', user.email);

        // Log Payment model schema for debugging
        try {
            console.log('📊 Payment Schema Info:');
            console.log('- Required paths:', Payment.schema.requiredPaths());
            console.log('- All paths:', Object.keys(Payment.schema.paths));
            
            // Check if type field has restrictions
            const typePath = Payment.schema.path('type');
            if (typePath) {
                console.log('- Type field options:', {
                    required: typePath.isRequired,
                    enum: typePath.enumValues,
                    default: typePath.defaultValue
                });
            }
        } catch (schemaError) {
            console.warn('⚠️ Could not log schema info:', schemaError.message);
        }

        // Create payment document object first for debugging
        const paymentDoc = {
            owner: userId,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            type: noteType, // Use the determined type
            metadata: {
                amount: razorpayOrder.amount / 100, // Convert back to rupees
                currency: razorpayOrder.currency,
                ...(noteType === 'token_purchase' && { tokensPurchased: tokenCount }),
                ...(noteType === 'subscription_upgrade' && { 
                    subscriptionTier: tier,
                    previousTier 
                })
            },
            status: 'successful',
            notes: razorpayOrder.notes
        };
        
        console.log('📄 Payment document to be created:', JSON.stringify(paymentDoc, null, 2));

        // Create payment record
        console.log('💾 Creating payment record');
        let payment;
        try {
            payment = await Payment.create([paymentDoc], { session });
            console.log('✅ Payment record created:', payment[0]._id.toString());
        } catch (paymentError) {
            console.error('❌ Payment creation error:', paymentError);
            console.error('- Error message:', paymentError.message);
            
            // Log validation errors in detail
            if (paymentError.name === 'ValidationError') {
                console.error('- Validation error details:');
                Object.keys(paymentError.errors).forEach(field => {
                    console.error(`  - ${field}: ${paymentError.errors[field].message}`);
                    if (paymentError.errors[field].kind === 'enum') {
                        console.error(`    Valid values: ${paymentError.errors[field].properties.enumValues}`);
                    }
                });
            }
            
            throw new Apierror(400, "Payment creation failed: " + paymentError.message);
        }

        // Process based on payment type
        console.log('🔄 Processing payment based on type:', noteType);
        
        if (noteType === 'token_purchase') {
            console.log('🪙 Processing token purchase:', tokenCount);
            try {
                await user.purchaseTokens(
                    parseInt(tokenCount), 
                    razorpay_payment_id, 
                    razorpayOrder.amount / 100
                );
                console.log('✅ Tokens added to user account');
            } catch (tokenError) {
                console.error('❌ Token purchase processing error:', tokenError);
                throw tokenError;
            }
        } else if (noteType === 'subscription_upgrade') {
            console.log('⭐ Processing subscription upgrade:', tier);
            try {
                await user.purchaseSubscription(
                    tier, 
                    razorpay_payment_id, 
                    razorpayOrder.amount / 100
                );
                console.log('✅ Subscription upgraded successfully');
            } catch (subscriptionError) {
                console.error('❌ Subscription upgrade error:', subscriptionError);
                throw subscriptionError;
            }
        } else {
            console.warn('⚠️ Unknown payment type:', noteType);
        }

        // Commit transaction
        console.log('💾 Committing transaction');
        await session.commitTransaction();
        console.log('✅ Transaction committed successfully');

        // Re-fetch user to get updated data
        const updatedUser = await User.findById(userId)
            .select('-password -refreshToken -emailVerificationToken -forgotPasswordToken');

        return res.status(200).json(
            new Apiresponse(200, { 
                paymentId: payment[0]._id,
                type: noteType,
                user: updatedUser
            }, "Payment processed successfully")
        );

    } catch (error) {
        // Abort transaction in case of error
        console.error('❌ Payment verification error:', error);
        console.error('- Error message:', error.message);
        console.error('- Error stack:', error.stack);
        
        try {
            console.log('🔄 Aborting transaction');
            await session.abortTransaction();
            console.log('✅ Transaction aborted');
        } catch (abortError) {
            console.error('❌ Error aborting transaction:', abortError);
        }
        
        throw new Apierror(400, "Payment verification failed: " + error.message);
    } finally {
        // End session
        try {
            console.log('🔄 Ending database session');
            session.endSession();
            console.log('✅ Database session ended');
        } catch (sessionError) {
            console.error('❌ Error ending session:', sessionError);
        }
    }
});

// Get User's Payment History
const getPaymentHistory = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    try {
        const payments = await Payment.find({ owner: userId })
            .sort({ createdAt: -1 });

        return res.status(200).json(
            new Apiresponse(
                200, 
                payments, 
                "Payment history retrieved successfully"
            )
        );
    } catch (error) {
        console.error("Payment history retrieval error:", error);
        throw new Apierror(500, "Failed to retrieve payment history");
    }
});

// Generate Payment Receipt
const generatePaymentReceipt = asyncHandler(async (req, res) => {
    const { paymentId } = req.params;
    const userId = req.user._id;

    try {
        // Find the payment
        const payment = await Payment.findOne({ 
            _id: paymentId, 
            owner: userId 
        });

        if (!payment) {
            throw new Apierror(404, "Payment not found");
        }

        // Prepare receipt items
        const items = [];
        if (payment.type === 'token_purchase') {
            items.push({
                description: 'Token Purchase',
                quantity: payment.metadata.tokensPurchased,
                unitPrice: payment.metadata.amount / payment.metadata.tokensPurchased,
                totalPrice: payment.metadata.amount
            });
        } else if (payment.type === 'subscription_upgrade') {
            items.push({
                description: `${payment.metadata.subscriptionTier} Subscription Upgrade`,
                quantity: 1,
                unitPrice: payment.metadata.amount,
                totalPrice: payment.metadata.amount
            });
        }

        // Create receipt
        const receipt = await PaymentReceipt.create({
            payment: payment._id,
            owner: userId,
            items,
            subtotal: payment.metadata.amount,
            tax: 0, // You might calculate tax based on location/rules
            total: payment.metadata.amount,
            issuedDate: new Date(),
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Valid for 30 days
        });

        return res.status(200).json(
            new Apiresponse(200, receipt, "Payment receipt generated successfully")
        );
    } catch (error) {
        console.error("Payment receipt generation error:", error);
        throw new Apierror(500, "Failed to generate payment receipt");
    }
});

// Get Payment by ID
const getPaymentById = asyncHandler(async (req, res) => {
    const { paymentId } = req.params;
    const userId = req.user._id;

    try {
        const payment = await Payment.findOne({ 
            _id: paymentId,
            owner: userId 
        });

        if (!payment) {
            throw new Apierror(404, "Payment not found");
        }

        return res.status(200).json(
            new Apiresponse(
                200, 
                payment, 
                "Payment details retrieved successfully"
            )
        );
    } catch (error) {
        console.error("Payment retrieval error:", error);
        throw new Apierror(500, "Failed to retrieve payment details");
    }
});

// Product Configuration
const PRODUCT_CONFIGS = {
  'basic': {
    productId: process.env.DODO_PRODUCT_ID_BASIC,
    name: 'Basic Plan',
    price: 12,
    tokenAmount: 40,
    maxTokens: 50
  },
  'premium': {
    productId: process.env.DODO_PRODUCT_ID_PREMIUM,
    name: 'Premium Plan',
    price: 20,
    tokenAmount: 80,
    maxTokens: 100
  }
};

// Create Static Payment Link
// Create Static Payment Link
const createStaticPaymentLink = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { tier } = req.body;

  console.group('🔗 Static Payment Link Generation');
  console.log('User ID:', userId);
  console.log('Selected Tier:', tier);

  // Validate tier
  const productConfig = PRODUCT_CONFIGS[tier];
  if (!productConfig) {
    console.error('❌ Invalid tier selected');
    throw new Apierror(400, "Invalid subscription tier");
  }

  try {
    // Generate a modified payment link with the test domain
    const baseUrl = `${process.env.DODO_API_BASE_URL}/buy/${productConfig.productId}`;
    const queryParams = new URLSearchParams({
      quantity: '1',
      redirect_url: `${process.env.FRONTEND_URL}/payment-confirmation`,
      metadata_user_id: userId.toString(),
      metadata_payment_type: 'subscription',
      metadata_tier: tier,
      metadata_price: productConfig.price.toString(),
      metadata_token_amount: productConfig.tokenAmount.toString()
    });
    
    const paymentLink = `${baseUrl}?${queryParams.toString()}`;

    console.log('Generated Payment Link:', paymentLink);
    
    console.log('✅ Payment Link Generated Successfully');
    console.groupEnd();

    return res.status(200).json(
      new Apiresponse(200, { 
        payment_link: paymentLink,
        payment_id: `pay_${Date.now()}`,
        total_amount: Math.round(productConfig.price * 100),
        pricing: {
          tier,
          basePrice: productConfig.price,
          finalPrice: productConfig.price
        },
        product: {
          tier,
          name: productConfig.name
        },
        metadata: {
          tier,
          price: productConfig.price,
          tokenAmount: productConfig.tokenAmount
        }
      }, "Static payment link created")
    );

  } catch (error) {
    console.error('❌ Payment Link Generation Error:', error);
    console.groupEnd();
    throw new Apierror(500, "Failed to create payment link");
  }
});

const verifyStaticPayment = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { payment_id, status, subscription_id } = req.body;

  console.group('🔐 Static Payment Verification');
  console.log('Payment ID:', payment_id);
  console.log('Status:', status);

  try {
    // For direct payment links, we can simplify verification
    // Just check if status is successful
    if (status !== 'succeeded') {
      console.error('❌ Payment Not Successful');
      throw new Apierror(400, "Payment was not successful");
    }

    // Determine tier from request body
    const tier = subscription_id || 'basic';
    const productConfig = PRODUCT_CONFIGS[tier];

    if (!productConfig) {
      console.error('❌ Invalid Tier:', tier);
      throw new Apierror(400, "Invalid subscription tier");
    }

    // 🔍 Check if payment already exists to prevent duplicates
    const existingPayment = await Payment.findOne({ dodo_payment_id: payment_id });
    console.log('🔍 Checking for existing payment:', payment_id);
    console.log('Existing Payment Found:', existingPayment ? 'Yes' : 'No');
    
    
    if (existingPayment) {
      console.log('⚠️ Payment already processed:', payment_id);
      console.log('✅ Payment Verified (Already Exists)');
      console.groupEnd();
      
      return res.status(200).json(
        new Apiresponse(200, { 
          subscription_details: {
            tier: existingPayment.subscription_tier,
            status: 'active',
            next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          },
          user: {
            tokens: user.tokens,
            subscription: user.subscription
          },
          payment_record_id: existingPayment._id,
          duplicate_prevented: true
        }, "Payment already processed successfully")
      );
    }

    // Get user's current subscription for previous_tier tracking
    const user = await User.findById(userId);
    const previousTier = user.subscription?.tier || 'none';

    // Process subscription
    await user.purchaseSubscription(
      tier,
      payment_id,
      productConfig.price
    );

    // 💾 Save payment record to database
    const paymentRecord = new Payment({
      owner: userId,
      dodo_payment_id: payment_id,
      amount: productConfig.price,
      currency: 'USD',
      type: previousTier === 'none' || previousTier === 'free' ? 'subscription_upgrade' : 'subscription_renewal',
      subscription_tier: tier,
      previous_tier: previousTier,
      status: 'successful'
    });

    await paymentRecord.save();
    console.log('💾 Payment record saved to database:', paymentRecord._id);

    console.log('✅ Payment Verified and Processed');
    console.groupEnd();

    return res.status(200).json(
      new Apiresponse(200, { 
        subscription_details: {
          tier,
          status: 'active',
          next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        user: {
          tokens: user.tokens,
          subscription: user.subscription
        },
        payment_record_id: paymentRecord._id // Optional: include payment record ID
      }, "Payment processed successfully")
    );

  } catch (error) {
    console.error('❌ Payment Verification Error:', error);
    console.groupEnd();
    throw new Apierror(400, error.message || "Payment verification failed");
  }
});



export {
    createTokenPurchaseOrder,
    createSubscriptionUpgradeOrder,
    verifyPayment,
    getPaymentHistory,
    generatePaymentReceipt,
    getPaymentById,
    createStaticPaymentLink,
    verifyStaticPayment
};