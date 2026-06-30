import { verifyAdminToken } from "../utils/token.js";
import User from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";

// ── Core admin auth guard ─────────────────────────────────────────
export const adminAuth = async (req, res, next) => {
  try {
    const token =
      req.cookies?.admin_access_token ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    if (!token) {
      return next(new ApiError(401, "Access denied. No token provided."));
    }

    const decoded = verifyAdminToken(token);

    const admin = await User.findByPk(decoded.id);
    if (!admin) {
      return next(new ApiError(401, "Admin account not found or deactivated."));
    }

    if (!admin.is_active) {
      return next(new ApiError(403, "Admin account is suspended."));
    }

    if (![1, 2].includes(admin.role_id)) {
      return next(new ApiError(403, "Access denied. Not an admin account."));
    }

    req.admin = admin;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(new ApiError(401, "Session expired. Please login again."));
    }
    if (err.name === "JsonWebTokenError") {
      return next(new ApiError(401, "Invalid token."));
    }
    return next(new ApiError(401, "Authentication failed."));
  }
};

// ── Role-based access control ─────────────────────────────────────
// Usage: requireRole(1) = super_admin only, requireRole(1, 2) = super_admin + admin
export const requireRole = (...roleIds) => {
  return (req, res, next) => {
    if (!req.admin) {
      return next(new ApiError(401, "Unauthorized."));
    }
    if (!roleIds.includes(req.admin.role_id)) {
      return next(new ApiError(403, "Access denied. Insufficient permissions."));
    }
    next();
  };
};