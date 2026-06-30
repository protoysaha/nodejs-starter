// src/utils/logger.js
// Production-grade logger using console with structured output.
// Drop-in replace with winston/pino later without changing any other file.

const isDev = process.env.NODE_ENV !== "production";

const formatStack = (stack) => {
  if (!stack) return "";
  // Extract only app lines (skip node_modules)
  return stack
    .split("\n")
    .filter((line) => !line.includes("node_modules"))
    .join("\n");
};

export const logger = {
  // Detailed dev log — file, line, full stack
  error(message, err = null, meta = {}) {
    const timestamp = new Date().toISOString();

    if (isDev) {
      console.error(`\n❌ [${timestamp}] ERROR: ${message}`);
      if (meta && Object.keys(meta).length) {
        console.error("   Meta:", JSON.stringify(meta, null, 2));
      }
      if (err) {
        console.error("   Message:", err.message);
        if (err.stack) {
          console.error("   Stack:\n" + formatStack(err.stack));
        }
      }
    } else {
      // Production: structured JSON — goes to log aggregator (Datadog, CloudWatch etc)
      console.error(JSON.stringify({
        level:     "error",
        timestamp,
        message,
        ...meta,
        error:     err ? { message: err.message, code: err.code } : undefined,
        // Never log stack in production JSON — use log aggregator source maps
      }));
    }
  },

  warn(message, meta = {}) {
    const timestamp = new Date().toISOString();
    if (isDev) {
      console.warn(`⚠️  [${timestamp}] WARN: ${message}`, meta);
    } else {
      console.warn(JSON.stringify({ level: "warn", timestamp, message, ...meta }));
    }
  },

  info(message, meta = {}) {
    const timestamp = new Date().toISOString();
    if (isDev) {
      console.log(`ℹ️  [${timestamp}] INFO: ${message}`, Object.keys(meta).length ? meta : "");
    } else {
      console.log(JSON.stringify({ level: "info", timestamp, message, ...meta }));
    }
  },
};