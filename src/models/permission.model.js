// src/models/permission.model.js
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Permission = sequelize.define(
    "Permission",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
            comment: 'Permission name: create_user, delete_post, etc.'
        },
        key: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
        },
        module: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'Module: users, exercises, workouts, nutrition, etc.'
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
    },
    {
        tableName: "permissions",
        timestamps: true,
    }
);

export default Permission;