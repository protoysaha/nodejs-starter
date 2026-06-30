import { Router } from "express";
import {
  getAllPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  togglePermissionStatus,
  deletePermission,
  getPermissionsByRole,
  assignPermissionsToRole,
  addPermissionToRole,
  removePermissionFromRole,
} from "../../controllers/admin/permission.controller.js";
import { adminAuth, requireRole } from "../../middlewares/admin.middleware.js";
import { createPermissionRules, updatePermissionRules, validate } from "../../validators/permission.validator.js";

const router = Router();

// All permission routes: must be super_admin only
router.use(adminAuth, requireRole(1));

// ── Permission CRUD ───────────────────────────────────────────────
router.get("/",              getAllPermissions);
router.get("/:id",           getPermissionById);
router.post("/",             createPermissionRules, validate, createPermission);
router.put("/:id",           updatePermissionRules, validate, updatePermission);
router.patch("/:id/status",  togglePermissionStatus);
router.delete("/:id",        deletePermission);

// ── Role ↔ Permission assignment ─────────────────────────────────
router.get("/role/:roleId",            getPermissionsByRole);      // view with checked state
router.put("/role/:roleId",            assignPermissionsToRole);   // replace all (bulk sync)
router.post("/role/:roleId/add",       addPermissionToRole);       // add one
router.delete("/role/:roleId/remove",  removePermissionFromRole);  // remove one

export default router;