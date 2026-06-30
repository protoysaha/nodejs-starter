import { Router } from "express";
import {
  getAllAdmins,
  createAdmin,
} from "../../controllers/admin/admin.controller.js";
import { adminAuth, requireRole } from "../../middlewares/admin.middleware.js";
import { createAdminRules, validate } from "../../validators/admin.validator.js";

const router = Router();

// All admin management routes require: valid admin token + super_admin role
router.use(adminAuth, requireRole("super_admin"));

router.get("/", getAllAdmins);
router.post("/", createAdminRules, validate, createAdmin);

export default router;