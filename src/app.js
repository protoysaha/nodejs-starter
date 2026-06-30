import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import "dotenv/config";
import { ApiError } from "./utils/ApiError.js";
import { logger }   from "./utils/logger.js";

// routes
import apiRouter    from "./routes/index.js"; 


const app = express()

// ── Security headers ──────────────────────────────────────────────
app.use(helmet());

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))
app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({ extended: true,limit:"16kb" }))
app.use(express.static('public'))
app.use(cookieParser())



// ── Global rate limiter ───────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Try again later." },
});
 
// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many auth attempts. Try again later." },
});

// routes

import userRouter from "./routes/user.routes.js"
import adminAuthRoutes from "./routes/admin/auth.routes.js";

app.use(globalLimiter);
// Auth rate limiters on login endpoints only
app.use("/api/v1/admin/auth/login", authLimiter);
app.use("/api/v1/user/auth/login", authLimiter);

//route declartion 
app.use("/api/v1", apiRouter);

// app.use("/api/v1/user/auth", userRouter)
// app.use("/api/v1/admin/auth", adminAuthRoutes); 






// ── Health check ──────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ success: true, message: "Server is running", env: process.env.NODE_ENV });
});
 
// ── 404 handler ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});
 
// ── Global error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message || err);

    // 1. Always log full detail on the SERVER (file + line + stack)
  logger.error(
    `${req.method} ${req.originalUrl}`,
    err,
    { ip: req.ip, userId: req.admin?.id ?? req.user?.id ?? null }
  );

  // ApiError thrown with new ApiError(statusCode, message)
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || [],
    });
  }

  // JWT errors that weren't caught in middleware
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ success: false, message: "Session expired." });
  }
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ success: false, message: "Invalid token." });
  }

  // Sequelize errors
  if (err.name === "SequelizeValidationError" || err.name === "SequelizeUniqueConstraintError") {
    return res.status(422).json({
      success: false,
      message: "Validation error.",
      errors: err.errors?.map((e) => ({ field: e.path, message: e.message })),
    });
  }

  // Fallback
  return res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error.",
  });
});

export{ app }