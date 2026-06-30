// src/models/role.model.js
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Role = sequelize.define(
    "Role",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            comment: 'Role name: super_admin, admin, user, etc.'
        },
        key: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            comment: 'URL-friendly role identifier'
        },
        description: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        is_active: {
            type: DataTypes.TINYINT,
            allowNull: false,
            defaultValue: 1, // 1 = active, 0 = inactive
            comment: "1 = active, 0 = inactive",

        },
        level: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'Higher number = more privileges. super_admin=100, admin=50, user=1'
        }
    },
    {
        tableName: "roles",
        timestamps: true,
    }
);

export default Role;