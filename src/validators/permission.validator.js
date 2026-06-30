import { body, validationResult } from "express-validator";
import { ApiError } from "../utils/ApiError.js";

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ApiError(422, "Validation failed.", errors.array()));
  }
  next();
};

export const createPermissionRules = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required.")
    .isLength({ max: 100 }).withMessage("Name max 100 chars."),
  body("key")
    .trim()
    .notEmpty().withMessage("Key is required.")
    .matches(/^[a-z0-9_:]+$/).withMessage("Key must be lowercase letters, numbers, underscores, colons only. e.g. users:view")
    .isLength({ max: 100 }).withMessage("Key max 100 chars."),
  body("module")
    .trim()
    .notEmpty().withMessage("Module is required.")
    .isLength({ max: 50 }).withMessage("Module max 50 chars."),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage("Description max 255 chars."),
];

export const updatePermissionRules = [
  body("name")
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage("Name max 100 chars."),
  body("key")
    .optional()
    .trim()
    .matches(/^[a-z0-9_:]+$/).withMessage("Key must be lowercase letters, numbers, underscores, colons only.")
    .isLength({ max: 100 }).withMessage("Key max 100 chars."),
  body("module")
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage("Module max 50 chars."),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage("Description max 255 chars."),
];