// import mongoose, { Schema } from "mongoose";
// import crypto from 'crypto';

// // Payment Schema
// const paymentSchema = new Schema(
//   {
//     // User who made the payment
//     owner: {
//       type: Schema.Types.ObjectId,
//       ref: "User",
//       required: true
//     },
    
//     // Razorpay specific details
//     razorpay_order_id: {
//       type: String,
//       required: true,
//       unique: true
//     },
//     razorpay_payment_id: {
//       type: String,
//       required: true,
//       unique: true
//     },
//     razorpay_signature: {
//       type: String,
//       required: true
//     },
    
//     // Payment type and purpose
//     type: {
//       type: String,
//       enum: [
//         'token_purchase', 
//         'subscription_upgrade', 
//         'subscription_renewal'
//       ],
//       required: true
//     },
    
//     // Detailed payment metadata
//     metadata: {
//       // For token purchase
//       tokensPurchased: {
//         type: Number,
//         default: 0
//       },
      
//       // For subscription
//       subscriptionTier: {
//         type: String,
//         enum: ['free', 'basic', 'premium']
//       },
//       previousTier: {
//         type: String,
//         enum: ['none', 'free', 'basic', 'premium']
//       },
      
//       // General payment details
//       amount: {
//         type: Number,
//         required: true
//       },
//       currency: {
//         type: String,
//         default: 'INR'
//       }
//     },
    
//     // Payment status tracking
//     status: {
//       type: String,
//       enum: ['pending', 'successful', 'failed', 'refunded'],
//       default: 'pending'
//     },
    
//     // Additional details
//     notes: {
//       type: Schema.Types.Mixed,
//       default: {}
//     }
//   },
//   { 
//     timestamps: true 
//   }
// );

// // Payment Receipt Schema
// const paymentReceiptSchema = new Schema(
//   {
//     payment: {
//       type: Schema.Types.ObjectId,
//       ref: "Payment",
//       required: true
//     },
//     owner: {
//       type: Schema.Types.ObjectId,
//       ref: "User",
//       required: true
//     },
    
//     // Receipt details
//     receiptNumber: {
//       type: String,
//       unique: true
//     },
//     items: [{
//       description: String,
//       quantity: Number,
//       unitPrice: Number,
//       totalPrice: Number
//     }],
    
//     // Financial breakdown
//     subtotal: Number,
//     tax: Number,
//     total: Number,
    
//     // Additional metadata
//     downloadKey: {
//       type: String,
//       unique: true
//     },
    
//     // Validity and tracking
//     issuedDate: {
//       type: Date,
//       default: Date.now
//     },
//     validUntil: Date
//   },
//   { 
//     timestamps: true 
//   }
// );

// // Generate unique receipt number and download key
// paymentReceiptSchema.pre('save', function(next) {
//   if (!this.receiptNumber) {
//     // Generate unique receipt number (e.g., RCP-YYYYMMDD-XXXXX)
//     const date = new Date();
//     const formattedDate = date.toISOString().slice(0,10).replace(/-/g,'');
//     this.receiptNumber = `RCP-${formattedDate}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
//   }
  
//   if (!this.downloadKey) {
//     // Generate cryptographically secure download key
//     this.downloadKey = crypto.randomBytes(16).toString('hex');
//   }
  
//   next();
// });

// export const Payment = mongoose.model("Payment", paymentSchema);
// export const PaymentReceipt = mongoose.model("PaymentReceipt", paymentReceiptSchema);


import mongoose, { Schema } from "mongoose";

const paymentSchema = new Schema(
  {
    // User who made the payment
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    
    // Dodo payment identifier
    dodo_payment_id: {
      type: String,
      required: true,
      unique: true
    },
    
    // Payment amount and currency
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    },
    
    // Payment purpose
    type: {
      type: String,
      enum: ['subscription_upgrade', 'subscription_renewal', 'token_purchase'],
      required: true
    },
    
    // Subscription details (optional - only for subscription payments)
    subscription_tier: {
      type: String,
      enum: ['basic', 'premium'],
      required: false
    },
    previous_tier: {
      type: String,
      enum: ['none', 'free', 'basic', 'premium'],
      required: false
    },
    
    // Payment status
    status: {
      type: String,
      enum: ['pending', 'successful', 'failed'],
      default: 'pending'
    }
  },
  { 
    timestamps: true 
  }
);

export const Payment = mongoose.model("Payment", paymentSchema);