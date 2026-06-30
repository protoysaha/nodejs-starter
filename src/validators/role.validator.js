// src/validators/role.validator.js
import { body, param } from "express-validator";
import { validate } from "./admin.validator.js"; // reuse your existing validate middleware

export const createRoleRules = [
  body("name")
    .trim()
    .notEmpty().withMessage("Role name is required.")
    .isLength({ max: 50 }).withMessage("Role name must be under 50 characters."),

  body("key")
    .trim()
    .notEmpty().withMessage("Role key is required.")
    .matches(/^[a-z0-9_]+$/).withMessage("Key must be lowercase letters, numbers, or underscores.")
    .isLength({ max: 50 }).withMessage("Role key must be under 50 characters."),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage("Description must be under 255 characters."),

  body("level")
    .optional()
    .isInt({ min: 0, max: 99 }).withMessage("Level must be between 0 and 99."), // 100 reserved for superadmin

  body("permission_ids")
    .optional()
    .isArray().withMessage("permission_ids must be an array.")
    .custom((ids) => ids.every(Number.isInteger)).withMessage("All permission IDs must be integers."),
];

export const updateRoleRules = [
  param("id").isInt({ min: 1 }).withMessage("Invalid role ID."),

  body("name")
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage("Role name must be under 50 characters."),

  body("key")
    .optional()
    .trim()
    .matches(/^[a-z0-9_]+$/).withMessage("Key must be lowercase letters, numbers, or underscores."),

  body("level")
    .optional()
    .isInt({ min: 0, max: 99 }).withMessage("Level must be between 0 and 99."),

  body("is_active")
    .optional()
    .isIn([0, 1]).withMessage("is_active must be 0 or 1."),

  body("permission_ids")
    .optional()
    .isArray().withMessage("permission_ids must be an array.")
    .custom((ids) => ids.every(Number.isInteger)).withMessage("All permission IDs must be integers."),
];

export { validate };