// master routes
import { Router } from "express";
import userRoutes  from "./user/index.js";
import adminRoutes from "./admin/index.js";

const router = Router();

router.use("/user",  userRoutes);   // /api/v1/user/...
router.use("/admin", adminRoutes);  // /api/v1/admin/...

export default router;