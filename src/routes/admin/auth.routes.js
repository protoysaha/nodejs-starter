import { Router } from "express";
import {
  adminLogin,
  adminLogout,
  adminRefreshToken,
  getAdminProfile,
} from "../../controllers/admin/auth.controller.js";
import { adminAuth } from "../../middlewares/admin.middleware.js";
import { adminLoginRules, validate } from "../../validators/admin.validator.js";

const router = Router();

// Public routes 
router.post("/login", adminLoginRules, validate, adminLogin);
router.post("/refresh-token", adminRefreshToken);

// Protected routes 
router.post("/logout", adminAuth, adminLogout);
router.get("/profile", adminAuth, getAdminProfile);

export default router;