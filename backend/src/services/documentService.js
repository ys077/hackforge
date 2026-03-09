const { Document, Worker, TrustScore } = require("../models");
const mlService = require("./mlService");
const { addJob, QUEUE_NAMES } = require("../config/queue");
const { NotFoundError, DocumentVerificationError } = require("../utils/errors");
const { deleteFile, getFileUrl } = require("../middleware/upload");
const logger = require("../utils/logger");

class DocumentService {
  /**
   * Upload document
   */
  async uploadDocument(workerId, documentType, file, options = {}) {
    const worker = await Worker.findByPk(workerId);
    if (!worker) {
      throw new NotFoundError("Worker");
    }

    const document = await Document.create({
      worker_id: workerId,
      document_type: documentType,
      document_name: options.document_name || file.originalname,
      file_path: file.path,
      file_name: file.filename,
      file_size: file.size,
      mime_type: file.mimetype,
      verification_status: "pending",
      is_primary: options.is_primary || false,
      upload_ip: options.upload_ip,
    });

    // Queue for verification
    await addJob(QUEUE_NAMES.DOCUMENT_VERIFICATION, "verify-document", {
      documentId: document.id,
      workerId,
      documentType,
    });

    logger.info(`Document uploaded: ${document.id}`);

    return {
      document,
      fileUrl: getFileUrl(file.path),
    };
  }

  /**
   * Get worker documents
   */
  async getWorkerDocuments(workerId, documentType = null) {
    const documents = await Document.getWorkerDocuments(workerId, documentType);

    return documents.map((doc) => ({
      ...doc.toJSON(),
      fileUrl: getFileUrl(doc.file_path),
    }));
  }

  /**
   * Get document by ID
   */
  async getDocumentById(documentId, workerId = null) {
    const where = { id: documentId };
    if (workerId) {
      where.worker_id = workerId;
    }

    const document = await Document.findOne({ where });

    if (!document) {
      throw new NotFoundError("Document");
    }

    return {
      ...document.toJSON(),
      fileUrl: getFileUrl(document.file_path),
    };
  }

  /**
   * Verify document using AI
   */
  async verifyDocument(documentId) {
    const document = await Document.findByPk(documentId);

    if (!document) {
      throw new NotFoundError("Document");
    }

    try {
      // Call ML service for verification
      const verification = await mlService.verifyDocument(
        document.document_type,
        document.file_path, // ML service will read the file
      );

      // Update document with verification results
      document.ai_verified = verification.verified;
      document.ai_verification_score = verification.confidence;
      document.ai_verification_notes = JSON.stringify(
        verification.issues || [],
      );

      // Set OCR data if available
      if (verification.extracted_data) {
        await document.setOCRData(
          verification.extracted_data,
          verification.confidence,
        );
      }

      // Auto-approve if confidence is high enough
      if (verification.verified && verification.confidence >= 85) {
        document.verification_status = "verified";
        document.verified_at = new Date();
      } else if (verification.confidence < 50) {
        document.verification_status = "rejected";
        document.rejected_at = new Date();
        document.rejection_reason =
          verification.issues?.join(", ") || "Low confidence score";
      }
      // Otherwise keep as pending for manual review

      await document.save();

      // Update trust score
      await this.updateWorkerTrustScore(document.worker_id);

      // Queue notification
      if (document.verification_status === "verified") {
        await addJob(QUEUE_NAMES.NOTIFICATION, "document-verified", {
          documentId: document.id,
          workerId: document.worker_id,
        });
      }

      return {
        document,
        verification,
      };
    } catch (error) {
      logger.error("Document verification error:", error);
      throw new DocumentVerificationError("Failed to verify document");
    }
  }

  /**
   * Manual verification by admin
   */
  async manualVerify(documentId, adminId, approved, notes = null) {
    const document = await Document.findByPk(documentId);

    if (!document) {
      throw new NotFoundError("Document");
    }

    if (approved) {
      await document.verify(adminId, notes);
    } else {
      await document.reject(adminId, notes || "Manual rejection");
    }

    // Update trust score
    await this.updateWorkerTrustScore(document.worker_id);

    // Queue notification
    await addJob(QUEUE_NAMES.NOTIFICATION, "document-verification-update", {
      documentId: document.id,
      workerId: document.worker_id,
      status: document.verification_status,
    });

    return document;
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId, workerId) {
    const document = await Document.findOne({
      where: { id: documentId, worker_id: workerId },
    });

    if (!document) {
      throw new NotFoundError("Document");
    }

    // Delete file from storage
    await deleteFile(document.file_path);

    // Delete record
    await document.destroy();

    // Update trust score
    await this.updateWorkerTrustScore(workerId);

    return { message: "Document deleted successfully" };
  }

  /**
   * Get verification stats for worker
   */
  async getVerificationStats(workerId) {
    return Document.getVerificationStats(workerId);
  }

  /**
   * Update worker trust score based on documents
   */
  async updateWorkerTrustScore(workerId) {
    try {
      const worker = await Worker.findByPk(workerId);
      if (!worker) return;

      // Get document stats
      const documentStats = await Document.getVerificationStats(workerId);

      // Get or create trust score
      const { trustScore } = await TrustScore.getOrCreate(workerId);

      // Calculate document verification score
      const docScore =
        documentStats.total > 0
          ? (documentStats.verified / documentStats.total) * 100
          : 0;

      // Update trust score
      await trustScore.recalculate({
        profile_completeness: worker.profile_completion,
        document_verification: docScore,
      });

      logger.debug(
        `Updated trust score for worker ${workerId}: ${trustScore.overall_score}`,
      );

      return trustScore;
    } catch (error) {
      logger.error("Failed to update trust score:", error);
    }
  }

  /**
   * Check if worker has required documents for a scheme
   */
  async hasRequiredDocuments(workerId, requiredDocTypes) {
    const stats = await Document.getVerificationStats(workerId);

    const missing = [];
    for (const docType of requiredDocTypes) {
      if (!stats.by_type[docType]?.verified) {
        missing.push(docType);
      }
    }

    return {
      hasAll: missing.length === 0,
      missing,
      verified: Object.entries(stats.by_type)
        .filter(([_, v]) => v.verified)
        .map(([k, _]) => k),
    };
  }

  /**
   * Get pending documents for admin review
   */
  async getPendingDocuments(pagination = {}) {
    const { page = 1, limit = 20 } = pagination;
    const { Op } = require("../utils/mongoOp");

    const { count, rows: documents } = await Document.findAndCountAll({
      where: {
        verification_status: "pending",
        ai_verified: true, // Already passed AI check
        ai_verification_score: { [Op.between]: [50, 85] }, // Needs manual review
      },
      include: [
        {
          model: Worker,
          as: "worker",
          include: [
            {
              model: require("../models").User,
              as: "user",
              attributes: ["name", "phone"],
            },
          ],
        },
      ],
      order: [["created_at", "ASC"]],
      limit,
      offset: (page - 1) * limit,
    });

    return {
      data: documents.map((d) => ({
        ...d.toJSON(),
        fileUrl: getFileUrl(d.file_path),
      })),
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }
}

module.exports = new DocumentService();
