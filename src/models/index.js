// src/models/index.js
import sequelize from "../config/database.js";
import User from "./user.model.js";
import Role from "./role.model.js";
import Permission from "./permission.model.js";
import RolePermission from "./rolePermission.model.js";

// User - Role (Many-to-One)
User.belongsTo(Role, { foreignKey: "role_id", as: "role" });
Role.hasMany(User, { foreignKey: "role_id", as: "users" });

// Role - Permission (Many-to-Many)
Role.belongsToMany(Permission, {
    through: RolePermission,
    foreignKey: "role_id",
    otherKey: "permission_id",
    as: "permissions"
});

Permission.belongsToMany(Role, {
    through: RolePermission,
    foreignKey: "permission_id",
    otherKey: "role_id",
    as: "roles"
});

export {
    sequelize,
    User,
    Role,
    Permission,
    RolePermission
};