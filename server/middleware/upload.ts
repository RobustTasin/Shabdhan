import multer from "multer";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "application/pdf",
]);

const storage = multer.memoryStorage();

export const uploadEvidence = multer({
  storage,

  limits: {
    fileSize: 25 * 1024 * 1024,
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
