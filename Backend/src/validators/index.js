import {body} from 'express-validator'

const userRegistrationValidator = () => {
    return [
        body('email')
            .trim()
            .notEmpty().withMessage("Email is required")
            .isEmail().withMessage("Email is invalid"),

        body('username')
            .trim()
            .notEmpty().withMessage("username is required")
            .isLength({min: 3}).withMessage("Minimum 3 characters is required")
            .isLength({max: 13}).withMessage("Maximum 13 characters allowed")
    ]
}

const userLoginvalidator = () => {
    return [
        body('email')
            .trim()
            .notEmpty().withMessage("Email is required")
            .isEmail().withMessage("Email is not valid"),
        
        body('password')
            .notEmpty().withMessage("Password is required")
    ]
}

const linkExchangeValidator = () => {
    return [
        body('title')
            .trim()
            .notEmpty().withMessage("Title is required")
            .isLength({ min: 3, max: 100 }).withMessage("Title must be between 3 and 100 characters"),

        body('DR')
            .notEmpty().withMessage("Domain Rating is required")
            .isNumeric().withMessage("Domain Rating must be a number")
            .isInt({ min: 0, max: 5 }).withMessage("Domain Rating must be between 0 and 5"),

        body('traffic')
            .notEmpty().withMessage("Traffic is required")
            .isNumeric().withMessage("Traffic must be a number")
            .isInt({ min: 0 }).withMessage("Traffic must be a positive number"),

        body('website')
            .trim()
            .notEmpty().withMessage("Website is required")
            .isURL().withMessage("Website must be a valid URL"),

        body('guideline')
            .trim()
            .notEmpty().withMessage("Guideline is required")
            .isLength({ min: 10, max: 500 }).withMessage("Guideline must be between 10 and 500 characters"),

        body('pagetypes')
            .trim()
            .notEmpty().withMessage("Page types is required")
            .isLength({ min: 3, max: 100 }).withMessage("Page types must be between 3 and 100 characters"),

        body('tat')
            .trim()
            .notEmpty().withMessage("Turn around time is required")
            .isLength({ min: 3, max: 50 }).withMessage("Turn around time must be between 3 and 50 characters"),

        body('notes')
            .optional()
            .trim()
            .isLength({ max: 500 }).withMessage("Notes cannot exceed 500 characters")
    ]
}


export {
    userRegistrationValidator,
    userLoginvalidator,
    linkExchangeValidator
}