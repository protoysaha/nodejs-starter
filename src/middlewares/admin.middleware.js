import { verifyAdminToken } from "../utils/token.js";
import { User } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";
import { getEffectivePermissions } from "../services/permission.service.js";

// Role IDs that are allowed into the admin panel at all
// 1=super_admin, 2=admin, 3=moderator, 4=trainer, 5=nutritionist
// Adjust numbers to match your actual roles seed data
const ADMIN_ROLE_IDS = [1, 2, 3, 4, 5];

// ── Core admin auth guard ─────────────────────────────────────────
// Verifies JWT, loads user, confirms they are an admin-level role
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

    const admin = await User.findByPk(decoded.id, {
      attributes: { exclude: ["password", "refresh_token"] },
    });

    if (!admin) {
      return next(new ApiError(401, "Admin account not found."));
    }
    if (!admin.is_active) {
      return next(new ApiError(403, "Admin account is suspended."));
    }
    if (!ADMIN_ROLE_IDS.includes(admin.role_id)) {
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

// ── Role guard ────────────────────────────────────────────────────
// Restricts a route to specific role IDs only.
// Use for structural restrictions e.g. only super_admin can manage other admins.
// Usage: requireRole(1)       → super_admin only
//        requireRole(1, 2)    → super_admin + admin
export const requireRole = (...roleIds) => {
  return (req, res, next) => {
    if (!req.admin) {
      return next(new ApiError(401, "Unauthorized."));
    }
    if (!roleIds.includes(req.admin.role_id)) {
      return next(new ApiError(403, "Access denied. Insufficient role."));
    }
    next();
  };
};

// ── Permission guard ──────────────────────────────────────────────

// export const requirePermission = (...permissionKeys) => {
//   return async (req, res, next) => {
//     try {
//       if (!req.admin) {
//         return next(new ApiError(401, "Unauthorized."));
//       }

//       // ── Superuser bypass ─────────────────────────────────────────
//       // super_admin gets full access with zero DB queries.
//       // Never seed role_permissions rows for role_id=1 — bypass fires first.
//       if (req.admin.role_id === 1) {
//         return next();
//       }

//       // ── Everyone else: check effective permissions ────────────────
//       // getEffectivePermissions = role permissions + grant overrides - revoke overrides
//       // Result is cached per user for 5 minutes (see permission.service.js)
//       const effective = await getEffectivePermissions(req.admin.id);

//       const hasAll = permissionKeys.every((key) => effective.has(key));
//       if (!hasAll) {
//         const missing = permissionKeys.filter((k) => !effective.has(k));
//         return next(
//           new ApiError(403, `Access denied. Missing: ${missing.join(", ")}`)
//         );
//       }

//       next();
//     } catch (err) {
//       next(err);
//     }
//   };
// };


// Replace only the requirePermission function in src/middlewares/admin.middleware.js

export const requirePermission = (...permissionKeys) => {
  return async (req, res, next) => {
    try {
      if (!req.admin) return next(new ApiError(401, "Unauthorized."));

      // super_admin bypasses all permission checks
      if (req.admin.role_id === 1) return next();

      const effective = await getEffectivePermissions(req.admin.id);

      const missing = permissionKeys.filter((k) => !effective.has(k));
      if (missing.length > 0) {
        // Dev: log which permissions are missing (visible in terminal only)
        logger.warn("Permission denied", {
          adminId:  req.admin.id,
          role_id:  req.admin.role_id,
          required: permissionKeys,
          missing,
          url:      req.originalUrl,
        });

        // Client: friendly message — never expose internal permission keys
        return next(
          new ApiError(403, "You do not have permission to perform this action.")
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};