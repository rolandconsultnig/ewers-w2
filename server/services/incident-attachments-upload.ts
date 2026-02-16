import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDir(UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const top = file.mimetype.startsWith("image/")
      ? "images"
      : file.mimetype.startsWith("video/")
        ? "videos"
        : file.mimetype.startsWith("audio/")
          ? "audio"
          : "documents";

    const dest = path.join(UPLOAD_DIR, top);
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || ".bin";
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 50);
    cb(null, `${safeName}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const ok =
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/") ||
    file.mimetype.startsWith("audio/") ||
    file.mimetype === "application/pdf";
  if (ok) cb(null, true);
  else cb(new Error(`File type not allowed: ${file.mimetype}`));
};

export const incidentAttachmentsUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || "26214400", 10) },
}).array("files", 10);

export function getUploadSubdir(mimetype: string): string {
  if (mimetype.startsWith("image/")) return "images";
  if (mimetype.startsWith("video/")) return "videos";
  if (mimetype.startsWith("audio/")) return "audio";
  return "documents";
}
