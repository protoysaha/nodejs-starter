import { Router } from "express";
import {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  toggleRoleStatus,
  deleteRole,
} from "../../controllers/admin/role.controller.js";
import { adminAuth, requireRole } from "../../middlewares/admin.middleware.js";
import { createRoleRules, updateRoleRules, validate } from "../../validators/role.validator.js";

const router = Router();

// All role routes: 
router.use(adminAuth, requireRole(1));

router.get("/",                  getAllRoles);
router.get("/:id",               getRoleById);
router.post("/",                 createRoleRules, validate, createRole);
router.put("/:id",               updateRoleRules, validate, updateRole);
router.patch("/:id/status",      toggleRoleStatus);
router.delete("/:id",            deleteRole);
export default router;