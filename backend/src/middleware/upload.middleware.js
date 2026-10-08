import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import multer from 'multer';

import AppError from '../utils/AppError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOCUMENTS_STORAGE_PATH = path.resolve(
  __dirname,
  '../../storage/documents'
);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_FILE_TYPES = Object.freeze({
  '.pdf': 'application/pdf',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx':
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
});

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, DOCUMENTS_STORAGE_PATH);
  },

  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    callback(
      null,
      `${crypto.randomUUID()}${extension}`
    );
  },
});

function fileFilter(_req, file, callback) {
  const extension = path.extname(file.originalname).toLowerCase();
  const expectedMimeType = ALLOWED_FILE_TYPES[extension];

  if (!expectedMimeType) {
    return callback(
      new AppError(
        'Unsupported file type. Allowed types: PDF, DOCX, XLSX, PNG, JPG, JPEG',
        400
      )
    );
  }

  if (file.mimetype !== expectedMimeType) {
    return callback(
      new AppError('File type does not match its extension', 400)
    );
  }

  callback(null, true);
}

export const uploadDocument = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter,
});