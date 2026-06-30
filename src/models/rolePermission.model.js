// src/models/role-permission.model.js
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const RolePermission = sequelize.define(
    "RolePermission",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        role_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "roles",
                key: "id",
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        },
        permission_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "permissions",
                key: "id",
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        }
    },
    {
        tableName: "role_permissions",
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['role_id', 'permission_id']
            }
        ]
    }
);

export default RolePermission;