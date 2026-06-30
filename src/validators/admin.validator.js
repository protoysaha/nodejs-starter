import { body, validationResult } from "express-validator";

// import { errorResponse } from "../utils/ApiError.js";
import { ApiError } from "../utils/ApiError.js";



// ── Reusable middleware to catch validation errors ────────────────
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiError(res, "Validation failed", 422, errors.array());
  }
  next();
};

// ── Admin login validation rules ──────────────────────────────────
export const adminLoginRules = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

// ── Create admin validation rules (super_admin only) ──────────────
export const createAdminRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email")
    .trim()
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage(
      "Password must contain at least one uppercase letter, one number, and one special character"
    ),
  body("role")
    .isIn(["super_admin", "admin", "moderator"])
    .withMessage("Invalid role"),
];