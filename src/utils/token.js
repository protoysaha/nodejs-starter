import jwt from "jsonwebtoken";
import { jwtConfig } from "../config/jwt.js";

// ── User tokens ──────────────────────────────────────────────────
export const signUserAccessToken = (payload) =>
  jwt.sign(payload, jwtConfig.user.secret, {
    expiresIn: jwtConfig.user.expiresIn,
  });

export const signUserRefreshToken = (payload) =>
  jwt.sign(payload, jwtConfig.user.refreshSecret, {
    expiresIn: jwtConfig.user.refreshExpiresIn,
  });

export const verifyUserToken = (token) =>
  jwt.verify(token, jwtConfig.user.secret);

export const verifyUserRefreshToken = (token) =>
  jwt.verify(token, jwtConfig.user.refreshSecret);

// ── Admin tokens ─────────────────────────────────────────────────
export const signAdminAccessToken = (payload) =>
  jwt.sign(payload, jwtConfig.admin.secret, {
    expiresIn: jwtConfig.admin.expiresIn,
  });

export const signAdminRefreshToken = (payload) =>
  jwt.sign(payload, jwtConfig.admin.refreshSecret, {
    expiresIn: jwtConfig.admin.refreshExpiresIn,
  });

export const verifyAdminToken = (token) =>
  jwt.verify(token, jwtConfig.admin.secret);

export const verifyAdminRefreshToken = (token) =>
  jwt.verify(token, jwtConfig.admin.refreshSecret);