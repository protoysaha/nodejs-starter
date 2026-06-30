import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  toggleUserStatus,
  updateUserRole,
} from "../../controllers/admin/users.controller.js";
import { adminAuth, requirePermission } from "../../middlewares/admin.middleware.js";

const router = Router();

router.get("/",               adminAuth, requirePermission("users:view"),   getAllUsers);
router.get("/:id",            adminAuth, requirePermission("users:view"),   getUserById);
router.patch("/:id/status",   adminAuth, requirePermission("users:update"), toggleUserStatus);
router.patch("/:id/role",     adminAuth, requirePermission("users:update"), updateUserRole);

export default router;