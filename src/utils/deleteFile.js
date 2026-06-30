import fs from "fs";
import path from "path";
import { logger } from "./logger.js";

// Deletes a file from local disk safely.
export const deleteFile = (filePath) => {
  if (!filePath) return false;

  try {
    // Resolve relative to project root (matches how multer saves paths)
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
      logger.info("Old file deleted", { path: filePath });
      return true;
    }

    logger.warn("File not found, skipping delete", { path: filePath });
    return false;
  } catch (err) {
    // Log but don't crash the request — old file staying on disk
    // is not critical enough to fail the whole update operation
    logger.error("Failed to delete file", err, { path: filePath });
    return false;
  }
};

// Async version — use when you don't want to block the event loop
export const deleteFileAsync = async (filePath) => {
  if (!filePath) return false;

  try {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    await fs.promises.access(absolutePath, fs.constants.F_OK);
    await fs.promises.unlink(absolutePath);
    logger.info("Old file deleted", { path: filePath });
    return true;
  } catch (err) {
    if (err.code === "ENOENT") {
      logger.warn("File not found, skipping delete", { path: filePath });
    } else {
      logger.error("Failed to delete file", err, { path: filePath });
    }
    return false;
  }
};