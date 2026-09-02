/**
 * Multer + Cloudinary Storage Middleware (Phase 3)
 * Used for service proof image uploads.
 *
 * Validates:
 *  - File type: JPEG, PNG, WebP only
 *  - File size: max 5 MB
 *
 * Stores to Cloudinary under 'servmate/proofs/' folder.
 * Returns file metadata (secure_url, public_id) via req.file.
 */

import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req) => ({
    folder: `servmate/proofs/${req.params.id || 'general'}`,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 900, crop: 'limit', quality: 'auto' }],
    resource_type: 'image',
  }),
});

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
  }
};

export const uploadProofImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_BYTES },
}).single('proof');

/**
 * Express middleware wrapper that catches multer errors and
 * returns a structured JSON error instead of crashing.
 */
export const handleUpload = (req, res, next) => {
  uploadProofImage(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ status: 'error', message: 'File too large. Maximum size is 5 MB.' });
      }
      return res.status(400).json({ status: 'error', message: err.message });
    }
    if (err) {
      return res.status(400).json({ status: 'error', message: err.message });
    }
    next();
  });
};
