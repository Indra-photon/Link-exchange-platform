// import { Router } from 'express';
// import { verifyJWT } from "../middlewares/auth.middlewares.js";
// import {
//     createTokenPurchaseOrder,
//     createSubscriptionUpgradeOrder,
//     verifyPayment,
//     getPaymentHistory,
//     generatePaymentReceipt
// } from '../controllers/payment.controller.js';

// const router = Router();

// // All payment routes require authentication
// router.use(verifyJWT);

// // Token Purchase Routes
// router.route("/tokens/create-order")
//     .post(createTokenPurchaseOrder);

// // Subscription Upgrade Routes
// router.route("/subscription/create-order")
//     .post(createSubscriptionUpgradeOrder);

// // Payment Verification
// router.route("/verify")
//     .post(verifyPayment);

// // Payment History
// router.route("/history")
//     .get(getPaymentHistory);

// // Payment Receipt Generation
// router.route("/receipt/:paymentId")
//     .get(generatePaymentReceipt);

// export default router;

import { Router } from 'express';
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
    createTokenPurchaseOrder,
    createSubscriptionUpgradeOrder,
    verifyPayment,
    getPaymentHistory,
    generatePaymentReceipt,
    getPaymentById,
    createStaticPaymentLink,
    verifyStaticPayment
} from '../controllers/payment.controller.js';

const router = Router();

// All payment routes require authentication
router.use(verifyJWT);

// Token Purchase Routes
router.route("/tokens/create-order")
    .post(createTokenPurchaseOrder);

// Subscription Upgrade Routes - KEEP EXISTING ROUTE
router.route("/subscription/create-order")
    .post(createSubscriptionUpgradeOrder);

// ADD NEW SIMPLIFIED ROUTE FOR COMPATIBILITY
router.route("/create-order")
    .post(createSubscriptionUpgradeOrder);

router.route("/dodo/subscription/create-payment-link")  // Match the route in the error message
    .post(createStaticPaymentLink);

router.route("/dodo/verify").post(verifyStaticPayment);

// Payment Verification
router.route("/verify")
    .post(verifyPayment);

// Payment History
router.route("/history")
    .get(getPaymentHistory);

// Payment Receipt Generation
router.route("/receipt/:paymentId")
    .get(generatePaymentReceipt);

router.route("/details/:paymentId")
    .get(getPaymentById);

export default router;