/**
 * File Upload Service - Multer-based handling for documents and media
 */
import multer from "multer";
import path from "path";
import fs from "fs";
import { logger } from "./logger";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  logger.info("Created upload directory", { dir: UPLOAD_DIR });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subdir = file.mimetype.startsWith("image/") ? "images" : "documents";
    const dest = path.join(UPLOAD_DIR, subdir);
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || ".bin";
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 50);
    cb(null, `${safeName}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedImages = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const allowedDocs = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/csv",
  ];
  const allowed = [...allowedImages, ...allowedDocs];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || "10485760", 10), // 10MB default
  },
});

export const singleUpload = upload.single("file");
export const multiUpload = upload.array("files", 10);
export const fieldsUpload = upload.fields([
  { name: "file", maxCount: 1 },
  { name: "images", maxCount: 5 },
]);

export function getUploadPath(filename: string, subdir?: string): string {
  const base = subdir ? path.join(UPLOAD_DIR, subdir) : UPLOAD_DIR;
  return path.join(base, filename);
}

export function deleteUploadedFile(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info("Deleted uploaded file", { path: filePath });
      return true;
    }
    return false;
  } catch (err) {
    logger.error("Failed to delete file", { path: filePath, error: err });
    return false;
  }
}
