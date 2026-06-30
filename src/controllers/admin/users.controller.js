import { User, Role, Permission } from "../../models/index.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { Op } from "sequelize";

// ── GET users
export const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, is_active, role_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {};

    if (search) {
      whereClause[Op.or] = [
        { fullname: { [Op.like]: `%${search}%` } },
        { email:    { [Op.like]: `%${search}%` } },
        { username: { [Op.like]: `%${search}%` } },
      ];
    }
    if (is_active !== undefined) {
      whereClause.is_active = parseInt(is_active);
    }
    if (role_id !== undefined) {
      whereClause.role_id = parseInt(role_id);
    }

    const { count, rows: users } = await User.findAndCountAll({
      where:    whereClause,
      attributes: { exclude: ["password", "refresh_token"] },
      include: [
        {
          // User → Role (direct association)
          model:      Role,
          as:         "role",
          attributes: ["id", "name", "key"],
          // Role → Permission (nested)
          // include: [
          //   {
          //     model:      Permission,
          //     as:         "permissions",
          //     attributes: ["id", "name", "key", "module"],
          //     through:    { attributes: [] },
          //   },
          // ],
        },
      ],
      order:    [["createdAt", "DESC"]],
      limit:    parseInt(limit),
      offset,
      distinct: true,
    });

    return res.status(200).json(
      new ApiResponse(200, {
        users,
        pagination: {
          total:      count,
          page:       parseInt(page),
          limit:      parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit)),
        },
      }, "Users fetched successfully.")
    );
  } catch (err) {
    next(err);
  }
};

// ── GET users/:id 
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ["password", "refresh_token"] },
      include: [
        {
          model:      Role,
          as:         "role",
          attributes: ["id", "name", "key"],
          include: [
            {
              model:      Permission,
              as:         "permissions",
              attributes: ["id", "name", "key", "module"],
              through:    { attributes: [] },
            },
          ],
        },
      ],
    });

    if (!user) throw new ApiError(404, "User not found.");

    return res.status(200).json(
      new ApiResponse(200, { user }, "User fetched successfully.")
    );
  } catch (err) {
    next(err);
  }
};

// ── PATCH users/:id/status
export const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) throw new ApiError(404, "User not found.");

    // Prevent deactivating yourself
    if (user.id === req.admin.id) {
      throw new ApiError(400, "You cannot deactivate your own account.");
    }

    await user.update({ is_active: user.is_active ? 0 : 1 });

    return res.status(200).json(
      new ApiResponse(200, {
        id:        user.id,
        is_active: user.is_active,
      }, `User ${user.is_active ? "activated" : "deactivated"} successfully.`)
    );
  } catch (err) {
    next(err);
  }
};

// ── PATCH users/:id/role 
export const updateUserRole = async (req, res, next) => {
  try {
    const { role_id } = req.body;
    if (!role_id) throw new ApiError(400, "role_id is required.");

    const user = await User.findByPk(req.params.id);
    if (!user) throw new ApiError(404, "User not found.");

    if (user.id === req.admin.id) {
      throw new ApiError(400, "You cannot change your own role.");
    }

    await user.update({ role_id });

    return res.status(200).json(
      new ApiResponse(200, { id: user.id, role_id }, "User role updated successfully.")
    );
  } catch (err) {
    next(err);
  }
};