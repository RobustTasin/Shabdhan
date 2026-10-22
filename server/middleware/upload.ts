import { NextFunction, Request, Response } from "express";
import multer from "multer";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);


// Check the actual file signature instead of trusting the client MIME header.
// This is a format sanity check, not a complete malware/content scan.
export function hasMatchingFileSignature(
  buffer: Buffer,
  mimetype: string
): boolean {
  if (!Buffer.isBuffer(buffer)) return false;

  switch (mimetype) {
    case "image/jpeg":
      return (
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
      );

    case "image/png":
      return (
        buffer.length >= 8 &&
        buffer.subarray(0, 8).equals(
          Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
        )
      );

    case "image/webp":
      return (
        buffer.length >= 12 &&
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP"
      );

    case "application/pdf":
      return (
        buffer.length >= 5 &&
        buffer.toString("ascii", 0, 5) === "%PDF-"
      );

    default:
      return false;
  }
}

const MB = 1024 * 1024;

// Each direct file is limited independently; there is deliberately no
// evidence-count limit because files are uploaded one at a time.
const MAX_UPLOAD_BYTES = 12 * MB;

export function maxBytesForMime(_mimetype: string): number {
  return MAX_UPLOAD_BYTES;
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
          "Unsupported file type. Allowed types: JPG, PNG, WEBP, PDF"
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
