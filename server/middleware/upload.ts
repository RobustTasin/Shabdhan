import { NextFunction, Request, Response } from "express";
import multer from "multer";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "application/pdf",
]);

const MB = 1024 * 1024;

// Largest file multer will accept at all
const MAX_UPLOAD_BYTES = 25 * MB;

// Per-type limits. Images and PDFs match Cloudinary's free-plan cap of
// 10 MB; videos may be larger but are held in memory while uploading, so
// they stay at 25 MB.
export function maxBytesForMime(mimetype: string): number {
  return mimetype.startsWith("video/") ? 25 * MB : 10 * MB;
}

export function formatLimit(bytes: number): string {
  return `${Math.round(bytes / MB)} MB`;
}

const storage = multer.memoryStorage();

export const uploadEvidence = multer({
  storage,

  limits: {
    fileSize: MAX_UPLOAD_BYTES,
  },

  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(
        new Error(
          "Unsupported file type. Allowed types: JPG, JPEG, PNG, WEBP, MP4, WEBM, PDF"
        )
      );
    }

    cb(null, true);
  },
});

// Runs multer for a single "file" field and answers its errors in the same
// JSON shape as the rest of the API. Without this, Express replies with an
// HTML error page and the app can only show "Request failed with status 500".
export function handleEvidenceUpload(
  req: Request,
  res: Response,
  next: NextFunction
) {
  uploadEvidence.single("file")(req, res, (error: unknown) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      return res.status(400).json({
        status: "error",
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? `File is too large (maximum ${formatLimit(MAX_UPLOAD_BYTES)})`
            : error.message,
      });
    }

    return res.status(400).json({
      status: "error",
      message:
        error instanceof Error ? error.message : "Invalid file upload",
    });
  });
}
