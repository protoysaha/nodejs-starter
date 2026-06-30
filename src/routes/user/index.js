import { Router } from "express";
import authRoutes from "./auth.routes.js";
import usersRoutes from "./users.routes.js";

const router = Router();

router.use("/auth", authRoutes); // /api/v1/user/auth/*
router.use("/", usersRoutes); 


export default router;