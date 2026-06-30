import { Router } from "express";
import authRoutes       from "./auth.routes.js";
import roleRoutes       from "./role.routes.js";
import permissionRoutes from "./permission.routes.js";
import usersRoutes from "./users.routes.js";




const router = Router();

router.use("/auth",        authRoutes);        // /api/v1/admin/auth/*
router.use("/roles",       roleRoutes);        // /api/v1/admin/roles/*
router.use("/permissions", permissionRoutes); 
router.use("/users", usersRoutes);  


export default router;