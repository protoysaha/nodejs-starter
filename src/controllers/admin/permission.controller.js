// src/controllers/admin/permission.controller.js
import { Role, Permission, RolePermission, User } from "../../models/index.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { Op } from "sequelize";
import { PermissionCache } from "../../services/permission.service.js";

// ── GET /api/v1/admin/permissions ────────────────────────────────
// All permissions grouped by module
export const getAllPermissions = async (req, res, next) => {
  try {
    const permissions = await Permission.findAll({
      order: [["module", "ASC"], ["key", "ASC"]],
    });

    // Group by module for easy frontend rendering
    const grouped = permissions.reduce((acc, p) => {
      if (!acc[p.module]) acc[p.module] = [];
      acc[p.module].push(p);
      return acc;
    }, {});

    return res.status(200).json(
      new ApiResponse(200, { permissions, grouped }, "Permissions fetched.")
    );
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/admin/permissions/:id ────────────────────────────
export const getPermissionById = async (req, res, next) => {
  try {
    const permission = await Permission.findByPk(req.params.id);
    if (!permission) throw new ApiError(404, "Permission not found.");

    return res.status(200).json(
      new ApiResponse(200, { permission }, "Permission fetched.")
    );
  } catch (err) {
    next(err);
  }
};

// ── POST /api/v1/admin/permissions ───────────────────────────────
// Create a new permission
export const createPermission = async (req, res, next) => {
  try {
    const { name, key, module, description } = req.body;

    const existing = await Permission.findOne({ where: { key } });
    if (existing) throw new ApiError(409, `Permission key '${key}' already exists.`);

    const permission = await Permission.create({
      name,
      key:         key.toLowerCase().trim(),
      module:      module.toLowerCase().trim(),
      description: description || null,
      is_active:   1,
    });

    return res.status(201).json(
      new ApiResponse(201, { permission }, "Permission created successfully.")
    );
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/v1/admin/permissions/:id ────────────────────────────
// Update a permission
export const updatePermission = async (req, res, next) => {
  try {
    const permission = await Permission.findByPk(req.params.id);
    if (!permission) throw new ApiError(404, "Permission not found.");

    const { name, key, module, description } = req.body;

    // If key is changing, check no duplicate
    if (key && key !== permission.key) {
      const duplicate = await Permission.findOne({
        where: { key, id: { [Op.ne]: req.params.id } },
      });
      if (duplicate) throw new ApiError(409, `Permission key '${key}' already exists.`);
    }

    await permission.update({
      name:        name        ?? permission.name,
      key:         key         ? key.toLowerCase().trim()    : permission.key,
      module:      module      ? module.toLowerCase().trim() : permission.module,
      description: description ?? permission.description,
    });

    // Invalidate all cached permissions since this key changed
    PermissionCache.invalidateAll();

    return res.status(200).json(
      new ApiResponse(200, { permission }, "Permission updated successfully.")
    );
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/v1/admin/permissions/:id/status ───────────────────
// Toggle active/inactive
export const togglePermissionStatus = async (req, res, next) => {
  try {
    const permission = await Permission.findByPk(req.params.id);
    if (!permission) throw new ApiError(404, "Permission not found.");

    await permission.update({ is_active: permission.is_active ? 0 : 1 });

    // Clear all caches — a disabled permission must stop working immediately
    PermissionCache.invalidateAll();

    return res.status(200).json(
      new ApiResponse(
        200,
        { permission },
        `Permission ${permission.is_active ? "activated" : "deactivated"}.`
      )
    );
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/v1/admin/permissions/:id ─────────────────────────
// Hard delete (removes from role_permissions too via CASCADE)
export const deletePermission = async (req, res, next) => {
  try {
    const permission = await Permission.findByPk(req.params.id);
    if (!permission) throw new ApiError(404, "Permission not found.");

    await permission.destroy();
    PermissionCache.invalidateAll();

    return res.status(200).json(
      new ApiResponse(200, {}, "Permission deleted successfully.")
    );
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/admin/permissions/role/:roleId ───────────────────
// Get all permissions for a specific role (with checked/unchecked state)
export const getPermissionsByRole = async (req, res, next) => {
  try {
    const role = await Role.findByPk(req.params.roleId, {
      include: [{ model: Permission, as: "permissions", through: { attributes: [] } }],
    });
    if (!role) throw new ApiError(404, "Role not found.");

    // All permissions in system
    const allPermissions = await Permission.findAll({
      order: [["module", "ASC"], ["key", "ASC"]],
    });

    const assignedIds = new Set(role.permissions.map((p) => p.id));

    // Return each permission with assigned:true/false — useful for checkbox UI
    const grouped = allPermissions.reduce((acc, p) => {
      if (!acc[p.module]) acc[p.module] = [];
      acc[p.module].push({ ...p.toJSON(), assigned: assignedIds.has(p.id) });
      return acc;
    }, {});

    return res.status(200).json(
      new ApiResponse(200, { role: { id: role.id, name: role.name }, grouped }, "Role permissions fetched.")
    );
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/v1/admin/permissions/role/:roleId ───────────────────
// Sync (replace) all permissions for a role
// Send: { permissionIds: [1, 3, 5, 7] }
// Removes all existing, inserts the new set — single atomic transaction
export const assignPermissionsToRole = async (req, res, next) => {
  try {
    const { permissionIds } = req.body;

    if (!Array.isArray(permissionIds)) {
      throw new ApiError(400, "permissionIds must be an array.");
    }

    const role = await Role.findByPk(req.params.roleId);
    if (!role) throw new ApiError(404, "Role not found.");

    // Prevent assigning permissions to super_admin via API — bypass handles it
    if (role.id === 1) {
      throw new ApiError(400, "super_admin has implicit access to everything. No permission assignment needed.");
    }

    // Validate all IDs exist
    const permissions = await Permission.findAll({
      where: { id: { [Op.in]: permissionIds }, is_active: 1 },
    });
    if (permissions.length !== permissionIds.length) {
      throw new ApiError(400, "One or more permission IDs are invalid or inactive.");
    }

    // Atomic replace: delete all then insert new
    await RolePermission.destroy({ where: { role_id: req.params.roleId } });

    if (permissionIds.length > 0) {
      const rows = permissionIds.map((pid) => ({
        role_id:       parseInt(req.params.roleId),
        permission_id: pid,
      }));
      await RolePermission.bulkCreate(rows);
    }

    // Invalidate cache for ALL users with this role
    const affectedUsers = await User.findAll({
      where:      { role_id: req.params.roleId },
      attributes: ["id"],
    });
    affectedUsers.forEach((u) => PermissionCache.invalidate(u.id));

    return res.status(200).json(
      new ApiResponse(
        200,
        { assignedCount: permissionIds.length },
        `${permissionIds.length} permissions assigned to role '${role.name}'.`
      )
    );
  } catch (err) {
    next(err);
  }
};

// ── POST /api/v1/admin/permissions/role/:roleId/add ──────────────
// Add a single permission to a role (non-destructive)
export const addPermissionToRole = async (req, res, next) => {
  try {
    const { permissionId } = req.body;
    const { roleId } = req.params;

    if (parseInt(roleId) === 1) {
      throw new ApiError(400, "Cannot assign permissions to super_admin.");
    }

    const [role, permission] = await Promise.all([
      Role.findByPk(roleId),
      Permission.findByPk(permissionId),
    ]);
    if (!role)       throw new ApiError(404, "Role not found.");
    if (!permission) throw new ApiError(404, "Permission not found.");

    const [, created] = await RolePermission.findOrCreate({
      where: { role_id: roleId, permission_id: permissionId },
    });

    if (!created) {
      return res.status(200).json(
        new ApiResponse(200, {}, "Permission was already assigned to this role.")
      );
    }

    // Invalidate cache for all users with this role
    const users = await User.findAll({ where: { role_id: roleId }, attributes: ["id"] });
    users.forEach((u) => PermissionCache.invalidate(u.id));

    return res.status(200).json(
      new ApiResponse(200, {}, `Permission '${permission.name}' added to role '${role.name}'.`)
    );
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/v1/admin/permissions/role/:roleId/remove ─────────
// Remove a single permission from a role (non-destructive)
export const removePermissionFromRole = async (req, res, next) => {
  try {
    const { permissionId } = req.body;
    const { roleId } = req.params;

    const deleted = await RolePermission.destroy({
      where: { role_id: roleId, permission_id: permissionId },
    });

    if (!deleted) {
      throw new ApiError(404, "This permission was not assigned to the role.");
    }

    const users = await User.findAll({ where: { role_id: roleId }, attributes: ["id"] });
    users.forEach((u) => PermissionCache.invalidate(u.id));

    return res.status(200).json(
      new ApiResponse(200, {}, "Permission removed from role.")
    );
  } catch (err) {
    next(err);
  }
};