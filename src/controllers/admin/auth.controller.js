import {
  signAdminAccessToken,
  signAdminRefreshToken,
  verifyAdminRefreshToken,
} from "../../utils/token.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import User from "../../models/user.model.js";

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

// ── POST login 
export const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const admin = await User.findOne({ where: { email } });
    if (!admin) {
      throw new ApiError(401, "Invalid credentials.");
    }

    if (![1, 2].includes(admin.role_id)) {
      throw new ApiError(403, "Access denied. Not an admin account.");
    }

    if (!admin.is_active) {
      throw new ApiError(403, "Your account has been suspended.");
    }

    const isMatch = await admin.isPasswordCorrect(password);
    if (!isMatch) {
      throw new ApiError(401, "Invalid credentials.");
    }

    const tokenPayload = { id: admin.id, role_id: admin.role_id, type: "admin" };
    const accessToken  = signAdminAccessToken(tokenPayload);
    const refreshToken = signAdminRefreshToken({ id: admin.id, type: "admin" });

    await User.update(
      { refresh_token: refreshToken, last_login: new Date() },
      { where: { id: admin.id } }
    );

    res.cookie("admin_access_token",  accessToken,  ACCESS_COOKIE_OPTIONS);
    res.cookie("admin_refresh_token", refreshToken, REFRESH_COOKIE_OPTIONS);

    return res.status(200).json(
      new ApiResponse(200, {
        admin: {
          id:       admin.id,
          fullname: admin.fullname,
          email:    admin.email,
          role_id:  admin.role_id,
        },
        accessToken,
        refreshToken, 
      }, "Login successful.")
    );
  } catch (err) {
    next(err);
  }
};

// logout 
export const adminLogout = async (req, res, next) => {
  try {
    await User.update(
      { refresh_token: null },
      { where: { id: req.admin.id } }
    );

    res.clearCookie("admin_access_token");
    res.clearCookie("admin_refresh_token");

    return res.status(200).json(new ApiResponse(200, {}, "Logged out successfully."));
  } catch (err) {
    next(err);
  }
};

// ── POST refresh-token 
export const adminRefreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.admin_refresh_token;
    if (!token) {
      throw new ApiError(401, "No refresh token provided.");
    }

    const decoded = verifyAdminRefreshToken(token);

    const admin = await User.findOne({ where: { refresh_token: token } });
    if (!admin || admin.id !== decoded.id) {
      throw new ApiError(401, "Invalid refresh token.");
    }

    if (!admin.is_active) {
      throw new ApiError(403, "Account suspended.");
    }

    const tokenPayload    = { id: admin.id, role_id: admin.role_id, type: "admin" };
    const newAccessToken  = signAdminAccessToken(tokenPayload);
    const newRefreshToken = signAdminRefreshToken({ id: admin.id, type: "admin" });

    await User.update(
      { refresh_token: newRefreshToken, last_login: new Date() },
      { where: { id: admin.id } }
    );

    res.cookie("admin_access_token",  newAccessToken,  ACCESS_COOKIE_OPTIONS);
    res.cookie("admin_refresh_token", newRefreshToken, REFRESH_COOKIE_OPTIONS);

    return res.status(200).json(
      new ApiResponse(200, {
        accessToken:  newAccessToken,
        refreshToken: newRefreshToken,
      }, "Token refreshed.")
    );
  } catch (err) {
    next(err);
  }
};

// ── GET Profile
export const getAdminProfile = async (req, res, next) => {
  try {
    // Return admin without sensitive fields
    const { password, refresh_token, ...adminData } = req.admin.dataValues;

    return res.status(200).json(
      new ApiResponse(200, { admin: adminData }, "Admin profile fetched.")
    );
  } catch (err) {
    next(err);
  }
};