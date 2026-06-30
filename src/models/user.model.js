import { DataTypes } from "sequelize";
import bcrypt from "bcryptjs";
import sequelize from "../config/database.js";

import jwt from "jsonwebtoken";
const User = sequelize.define(
    "User",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        fullname: {
            type: DataTypes.STRING(255),
            allowNull: false,
            trim: true,
            index: true
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true,
            },
            lowecase: true,
            trim: true,
        },
        username: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            lowecase: true,
            trim: true,
            index: true
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        avatar: {
            type: DataTypes.STRING(500),
            allowNull: false,
        },
        cover_image: {
            type: DataTypes.STRING(500),
            allowNull: true,

        },
        refresh_token: {
            type: DataTypes.STRING(500),

        },
        role_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 3, // Default to 'user' role
            references: {
                model: "roles",
                key: "id",
            },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE'
        },
        is_active: {
            type: DataTypes.TINYINT,
            allowNull: false,
            defaultValue: 1, // 1 = active, 0 = inactive
            comment: "1 = active, 0 = inactive",

        },
        last_login: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        // role: {
        //   type: DataTypes.ENUM("user", "admin"),
        //   defaultValue: "user",
        //   allowNull: false,
        // },
        // role_id: {
        //   type: DataTypes.INTEGER,
        //   references: {
        //     model: "roles",
        //     key: "id",
        //   },
        // },

    },
    {
        tableName: "users",
        timestamps: true,
        hooks: {
            beforeCreate: async (user) => {

                if (user.password) {
                    user.password = await bcrypt.hash(user.password, 12);
                }


            },
            beforeUpdate: async (user) => {

                if (user.changed("password")) {
                    user.password = await bcrypt.hash(user.password, 12);
                }


            },
        },
    }
);
User.prototype.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

User.prototype.generateAccessToken = function () {
    return jwt.sign(
        {
            id: this.id,
            email: this.email,
            username: this.username,
            fullname: this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
User.prototype.generateRefreshToken = function () {
    return jwt.sign(
        {
            id: this.id,

        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}


// User.belongsTo(Role, { foreignKey: "role_id", as: "role" });
// Role.hasMany(User, { foreignKey: "role_id", as: "users" });

export default User;
