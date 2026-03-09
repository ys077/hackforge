const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const config = require("../config");
const { FileUploadError } = require("../utils/errors");
const logger = require("../utils/logger");

// Ensure upload directories exist
const createUploadDirs = () => {
  const dirs = [
    config.upload.uploadDir,
    path.join(config.upload.uploadDir, "documents"),
    path.join(config.upload.uploadDir, "photos"),
    path.join(config.upload.uploadDir, "resumes"),
    path.join(config.upload.uploadDir, "temp"),
  ];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Created upload directory: ${dir}`);
    }
  });
};

createUploadDirs();

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = config.upload.uploadDir;

    // Determine subdirectory based on field name or file type
    if (file.fieldname === "document" || file.fieldname === "documents") {
      uploadPath = path.join(uploadPath, "documents");
    } else if (
      file.fieldname === "photo" ||
      file.fieldname === "profile_photo"
    ) {
      uploadPath = path.join(uploadPath, "photos");
    } else if (file.fieldname === "resume") {
      uploadPath = path.join(uploadPath, "resumes");
    } else {
      uploadPath = path.join(uploadPath, "temp");
    }

    // Create user-specific subdirectory if user is authenticated
    if (req.user?.id) {
      uploadPath = path.join(uploadPath, req.user.id);
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedName = file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .substring(0, 50);
    const filename = `${uniqueId}-${sanitizedName}`;
    cb(null, filename);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = config.upload.allowedTypes;

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new FileUploadError(
        `Invalid file type. Allowed types: ${allowedTypes.join(", ")}`,
      ),
      false,
    );
  }
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 5, // Maximum 5 files per request
  },
});

// Middleware for single file upload
const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          return next(new FileUploadError(err.message));
        }
        return next(err);
      }
      next();
    });
  };
};

// Middleware for multiple files upload
const uploadMultiple = (fieldName, maxCount = 5) => {
  return (req, res, next) => {
    upload.array(fieldName, maxCount)(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          return next(new FileUploadError(err.message));
        }
        return next(err);
      }
      next();
    });
  };
};

// Middleware for mixed file fields
const uploadFields = (fields) => {
  return (req, res, next) => {
    upload.fields(fields)(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          return next(new FileUploadError(err.message));
        }
        return next(err);
      }
      next();
    });
  };
};

// Memory storage for processing files before saving
const memoryStorage = multer.memoryStorage();

const uploadToMemory = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 5,
  },
});

// Helper to delete file
const deleteFile = async (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Deleted file: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Error deleting file ${filePath}:`, error);
    return false;
  }
};

// Helper to get file URL
const getFileUrl = (filePath) => {
  if (!filePath) return null;
  // Convert absolute path to relative URL
  const relativePath = filePath.replace(config.upload.uploadDir, "");
  return `/uploads${relativePath.replace(/\\/g, "/")}`;
};

// Helper to validate file exists
const fileExists = (filePath) => {
  return fs.existsSync(filePath);
};

// Cleanup old temp files (older than 24 hours)
const cleanupTempFiles = async () => {
  const tempDir = path.join(config.upload.uploadDir, "temp");
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  try {
    if (!fs.existsSync(tempDir)) return;

    const files = fs.readdirSync(tempDir);
    const now = Date.now();

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);

      if (now - stats.mtime.getTime() > maxAge) {
        if (stats.isDirectory()) {
          fs.rmSync(filePath, { recursive: true });
        } else {
          fs.unlinkSync(filePath);
        }
        logger.debug(`Cleaned up temp file: ${filePath}`);
      }
    }
  } catch (error) {
    logger.error("Error cleaning up temp files:", error);
  }
};

// Document type specific upload configurations
const documentUploadConfig = {
  aadhaar: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ["image/jpeg", "image/png", "image/jpg", "application/pdf"],
  },
  pan: {
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/png", "image/jpg", "application/pdf"],
  },
  passbook: {
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/png", "image/jpg", "application/pdf"],
  },
  certificate: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ["image/jpeg", "image/png", "image/jpg", "application/pdf"],
  },
  photo: {
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: ["image/jpeg", "image/png", "image/jpg"],
  },
};

// Validate document type specific constraints
const validateDocumentUpload = (documentType) => {
  return (req, res, next) => {
    const config = documentUploadConfig[documentType];

    if (!config) {
      return next(
        new FileUploadError(`Unknown document type: ${documentType}`),
      );
    }

    if (!req.file) {
      return next(new FileUploadError("No file uploaded"));
    }

    if (req.file.size > config.maxSize) {
      // Delete the uploaded file
      deleteFile(req.file.path);
      return next(
        new FileUploadError(`File size exceeds limit for ${documentType}`),
      );
    }

    if (!config.allowedTypes.includes(req.file.mimetype)) {
      deleteFile(req.file.path);
      return next(new FileUploadError(`Invalid file type for ${documentType}`));
    }

    next();
  };
};

// Specific upload middlewares for common use cases
const uploadDocument = uploadSingle("document");
const uploadPhoto = uploadSingle("photo");
const uploadProfilePhoto = uploadSingle("profile_photo");
const uploadResume = uploadSingle("resume");
const uploadLogo = uploadSingle("logo");

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  uploadToMemory,
  deleteFile,
  getFileUrl,
  fileExists,
  cleanupTempFiles,
  documentUploadConfig,
  validateDocumentUpload,
  uploadDocument,
  uploadPhoto,
  uploadProfilePhoto,
  uploadResume,
  uploadLogo,
};
