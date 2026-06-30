import bcrypt from "bcryptjs";
import User from "../../models/user.model.js"

import {
  signAdminAccessToken,
  signAdminRefreshToken,
  verifyAdminRefreshToken,
} from "../../utils/token.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";

import { Op } from "sequelize";



// Cookie options for admin tokens
const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 8 * 60 * 60 * 1000, // 8 hours
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 24 * 60 * 60 * 1000, // 1 day
};

// ── POST /api/v1/admin/auth/login ─────────────────────────────────
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await User.findByEmail(email);
    if (!admin) {
      return ApiError(res, "Invalid credentials.", 401);
    }

    if (admin.status !== "active") {
      return ApiError(res, "Your account has been suspended.", 403);
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return ApiError(res, "Invalid credentials.", 401);
    }

    // Sign tokens with admin-specific secret
    const tokenPayload = { id: admin.id, role: admin.role, type: "admin" };
    const accessToken = signAdminAccessToken(tokenPayload);
    const refreshToken = signAdminRefreshToken({ id: admin.id, type: "admin" });

    // Save refresh token to DB
    await User.updateLoginInfo(admin.id, refreshToken);

    // Set httpOnly cookies (Next.js admin will read these)
    res.cookie("admin_access_token", accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie("admin_refresh_token", refreshToken, REFRESH_COOKIE_OPTIONS);

    return ApiResponse(res, "Login successful.", {
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
      // Also return token in body so Next.js can store in memory if preferred
      accessToken,
    });
  } catch (err) {
    console.error("Admin login error:", err);
    return ApiError(res, "Login failed. Please try again.");
  }
};

// ── POST /api/v1/admin/auth/logout ────────────────────────────────
export const adminLogout = async (req, res) => {
  try {
    // Clear DB refresh token
    await User.clearRefreshToken(req.admin.id);

    // Clear cookies
    res.clearCookie("admin_access_token");
    res.clearCookie("admin_refresh_token");

    return ApiResponse(res, "Logged out successfully.");
  } catch (err) {
    console.error("Admin logout error:", err);
    return ApiError(res, "Logout failed.");
  }
};

// ── POST /api/v1/admin/auth/refresh-token ─────────────────────────
export const adminRefreshToken = async (req, res) => {
  try {
    const token = req.cookies?.admin_refresh_token;
    if (!token) {
      return ApiError(res, "No refresh token provided.", 401);
    }

    // Verify the refresh token
    const decoded = verifyAdminRefreshToken(token);

    // Check token matches what's in DB (rotation check)
    const admin = await User.findByRefreshToken(token);
    if (!admin || admin.id !== decoded.id) {
      return ApiError(res, "Invalid refresh token.", 401);
    }

    if (admin.status !== "active") {
      return ApiError(res, "Account suspended.", 403);
    }

    // Issue new tokens (token rotation)
    const tokenPayload = { id: admin.id, role: admin.role, type: "admin" };
    const newAccessToken = signAdminAccessToken(tokenPayload);
    const newRefreshToken = signAdminRefreshToken({ id: admin.id, type: "admin" });

    await User.updateLoginInfo(admin.id, newRefreshToken);

    res.cookie("admin_access_token", newAccessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie("admin_refresh_token", newRefreshToken, REFRESH_COOKIE_OPTIONS);

    return ApiResponse(res, "Token refreshed.", { accessToken: newAccessToken });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return ApiError(res, "Refresh token expired. Please login again.", 401);
    }
    return ApiError(res, "Token refresh failed.", 401);
  }
};

// ── GET /api/v1/admin/auth/me ─────────────────────────────────────
export const getAdminProfile = async (req, res) => {
  try {
    return ApiResponse(res, "Admin profile fetched.", { admin: req.admin });
  } catch (err) {
    return ApiError(res, "Failed to fetch profile.");
  }
};