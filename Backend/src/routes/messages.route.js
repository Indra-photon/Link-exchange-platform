import { Router } from 'express'
import { 
    sendMessage, 
    getMessages, 
    markMessagesAsRead, 
    getConversations, 
    getUnreadCount 
} from '../controllers/message.controller.js'
import { verifyJWT } from '../middlewares/auth.middleware.js'
import { validate } from '../middlewares/validation.middleware.js'
import { body, param, query } from 'express-validator'

const router = Router()

// Apply authentication middleware to all routes
router.use(verifyJWT)

// Validation middleware
const sendMessageValidation = [
    body('connectionId')
        .isMongoId()
        .withMessage('Valid connection ID is required'),
    body('content')
        .trim()
        .isLength({ min: 1, max: 1000 })
        .withMessage('Message content must be between 1 and 1000 characters'),
    body('receiver')
        .isMongoId()
        .withMessage('Valid receiver ID is required')
]

const getMessagesValidation = [
    param('connectionId')
        .isMongoId()
        .withMessage('Valid connection ID is required'),
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Limit must be between 1 and 50'),
    query('before')
        .optional()
        .isISO8601()
        .withMessage('Before must be a valid date')
]

const markAsReadValidation = [
    param('connectionId')
        .isMongoId()
        .withMessage('Valid connection ID is required')
]

// Routes
router.route('/send')
    .post(sendMessageValidation, validate, sendMessage)

router.route('/conversations/:connectionId')
    .get(getMessagesValidation, validate, getMessages)

router.route('/conversations/:connectionId/read')
    .put(markAsReadValidation, validate, markMessagesAsRead)

router.route('/conversations')
    .get(getConversations)

router.route('/unread-count')
    .get(getUnreadCount)

export default router