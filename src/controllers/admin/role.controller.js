// src/controllers/admin/role.controller.js
import { Role, Permission, User } from "../../models/index.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { Op } from "sequelize";

// ── GET /api/v1/admin/roles ───────────────────────────────────────
// List all roles with their permissions
export const getAllRoles = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, is_active } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { key: { [Op.like]: `%${search}%` } },
      ];
    }
    if (is_active !== undefined) {
      whereClause.is_active = parseInt(is_active);
    }

    const { count, rows: roles } = await Role.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Permission,
          as: "permissions",
          attributes: ["id", "name", "key", "module"],
          through: { attributes: [] }, // hide pivot table fields
        },
      ],
      order: [["level", "DESC"]],
      limit: parseInt(limit),
      offset,
      distinct: true, // needed for correct count with include
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          roles,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / parseInt(limit)),
          },
        },
        "Roles fetched successfully."
      )
    );
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/admin/roles/:id ───────────────────────────────────
export const getRoleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const role = await Role.findByPk(id, {
      include: [
        {
          model: Permission,
          as: "permissions",
          attributes: ["id", "name", "key", "module", "description"],
          through: { attributes: [] },
        },
      ],
    });

    if (!role) {
      throw new ApiError(404, "Role not found.");
    }

    return res.status(200).json(
      new ApiResponse(200, { role }, "Role fetched successfully.")
    );
  } catch (err) {
    next(err);
  }
};

// ── POST /api/v1/admin/roles ──────────────────────────────────────
export const createRole = async (req, res, next) => {
  try {
    const { name, key, description, level = 0, permission_ids = [] } = req.body;

    // Check duplicate name or key
    const existing = await Role.findOne({
      where: {
        [Op.or]: [{ name }, { key }],
      },
    });

    if (existing) {
      throw new ApiError(
        409,
        existing.name === name
          ? "A role with this name already exists."
          : "A role with this key already exists."
      );
    }

    // Validate permission_ids if provided
    if (permission_ids.length > 0) {
      const validPermissions = await Permission.findAll({
        where: { id: { [Op.in]: permission_ids }, is_active: 1 },
        attributes: ["id"],
      });

      if (validPermissions.length !== permission_ids.length) {
        throw new ApiError(400, "One or more permission IDs are invalid or inactive.");
      }
    }

    // Create role
    const role = await Role.create({ name, key, description, level, is_active: 1 });

    // Attach permissions via junction table
    if (permission_ids.length > 0) {
      await role.addPermissions(permission_ids); // Sequelize magic method from belongsToMany
    }

    // Re-fetch with permissions
    const createdRole = await Role.findByPk(role.id, {
      include: [
        {
          model: Permission,
          as: "permissions",
          attributes: ["id", "name", "key", "module"],
          through: { attributes: [] },
        },
      ],
    });

    return res.status(201).json(
      new ApiResponse(201, { role: createdRole }, "Role created successfully.")
    );
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/v1/admin/roles/:id ───────────────────────────────────
export const updateRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, key, description, level, is_active, permission_ids } = req.body;

    const role = await Role.findByPk(id);
    if (!role) {
      throw new ApiError(404, "Role not found.");
    }

    // Prevent editing system-critical roles (level >= 100 = superadmin)
    if (role.level >= 100) {
      throw new ApiError(403, "Cannot modify a system-level role.");
    }

    // Check for duplicate name/key — exclude current role
    if (name || key) {
      const orConditions = [];
      if (name) orConditions.push({ name });
      if (key) orConditions.push({ key });

      const duplicate = await Role.findOne({
        where: {
          [Op.or]: orConditions,
          id: { [Op.ne]: id }, // exclude self
        },
      });

      if (duplicate) {
        throw new ApiError(
          409,
          duplicate.name === name
            ? "A role with this name already exists."
            : "A role with this key already exists."
        );
      }
    }

    // Update scalar fields
    await role.update({
      ...(name !== undefined && { name }),
      ...(key !== undefined && { key }),
      ...(description !== undefined && { description }),
      ...(level !== undefined && { level }),
      ...(is_active !== undefined && { is_active }),
    });

    // Sync permissions if provided (full replace)
    if (Array.isArray(permission_ids)) {
      if (permission_ids.length > 0) {
        const validPermissions = await Permission.findAll({
          where: { id: { [Op.in]: permission_ids }, is_active: 1 },
          attributes: ["id"],
        });

        if (validPermissions.length !== permission_ids.length) {
          throw new ApiError(400, "One or more permission IDs are invalid or inactive.");
        }
      }
      // setPermissions replaces all existing associations
      await role.setPermissions(permission_ids);
    }

    // Re-fetch updated role
    const updatedRole = await Role.findByPk(id, {
      include: [
        {
          model: Permission,
          as: "permissions",
          attributes: ["id", "name", "key", "module"],
          through: { attributes: [] },
        },
      ],
    });

    return res.status(200).json(
      new ApiResponse(200, { role: updatedRole }, "Role updated successfully.")
    );
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/v1/admin/roles/:id/toggle-status ───────────────────
// Soft enable/disable a role without full update
export const toggleRoleStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const role = await Role.findByPk(id);
    if (!role) {
      throw new ApiError(404, "Role not found.");
    }

    if (role.level >= 100) {
      throw new ApiError(403, "Cannot deactivate a system-level role.");
    }

    const newStatus = role.is_active === 1 ? 0 : 1;
    await role.update({ is_active: newStatus });

    return res.status(200).json(
      new ApiResponse(
        200,
        { id: role.id, is_active: newStatus },
        `Role ${newStatus === 1 ? "activated" : "deactivated"} successfully.`
      )
    );
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/v1/admin/roles/:id ───────────────────────────────
export const deleteRole = async (req, res, next) => {
  try {
    const { id } = req.params;

    const role = await Role.findByPk(id);
    if (!role) {
      throw new ApiError(404, "Role not found.");
    }

    // Block deletion of system roles
    if (role.level >= 100) {
      throw new ApiError(403, "Cannot delete a system-level role.");
    }

    // Block deletion if any users are currently assigned this role
    const userCount = await User.count({ where: { role_id: id } });
    if (userCount > 0) {
      throw new ApiError(
        409,
        `Cannot delete role. ${userCount} user(s) are assigned to it. Reassign them first.`
      );
    }

    // Detach all permissions first (cleanup pivot table)
    await role.setPermissions([]);

    await role.destroy();

    return res.status(200).json(
      new ApiResponse(200, {}, "Role deleted successfully.")
    );
  } catch (err) {
    next(err);
  }
};