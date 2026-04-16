import express from "express";
import {
  initUpload,
  completeUpload,
  initMultipartUpload,
  completeMultipartUpload,
  initUploadAuto,
  completeUploadAuto,
} from "../controllers/upload.controller.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Upload
 *   description: Signed URL based upload system (Supabase Storage)
 */

/**
 * @swagger
 * /api/upload/init:
 *   post:
 *     summary: Initialize upload (no input required)
 *     tags: [Upload]
 *     description: |
 *       Step 1 of upload flow.
 *       Generates a signed URL where client can upload file directly.
 *
 *       Flow:
 *       1. Call this API
 *       2. Use returned signedUrl to upload file (PUT request)
 *       3. Call /complete to finalize
 *     requestBody:
 *       required: false
 *     responses:
 *       200:
 *         description: Upload initialized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Upload initialized
 *                 data:
 *                   type: object
 *                   properties:
 *                     uploadId:
 *                       type: string
 *                       example: uuid-value
 *                     filePath:
 *                       type: string
 *                       example: uuid-file-171234
 *                     signedUrl:
 *                       type: string
 *                     token:
 *                       type: string
 *       500:
 *         description: Server error
 */
router.post("/init", initUpload);

/**
 * @swagger
 * /api/upload/complete:
 *   post:
 *     summary: Complete upload (verify + metadata extraction)
 *     tags: [Upload]
 *     description: |
 *       Step 3 of upload flow.
 *
 *       This API:
 *       - Verifies file exists in storage
 *       - Extracts metadata (size, mimeType)
 *       - Validates file type and size
 *       - Returns public URL
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - uploadId
 *               - filePath
 *             properties:
 *               uploadId:
 *                 type: string
 *                 example: uuid-value
 *               filePath:
 *                 type: string
 *                 example: uuid-file-171234
 *     responses:
 *       200:
 *         description: Upload completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Upload completed
 *                 data:
 *                   type: object
 *                   properties:
 *                     publicUrl:
 *                       type: string
 *                     size:
 *                       type: number
 *                     mimeType:
 *                       type: string
 *       400:
 *         description: Validation or upload failure
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: failed
 *                 message:
 *                   type: string
 *                   example: Invalid file type
 *       500:
 *         description: Server error
 */
router.post("/complete", completeUpload);

/**
 * @swagger
 * /api/upload/init-multipart:
 *   post:
 *     summary: Initialize multipart upload (for large files)
 *     tags: [Upload]
 *     description: |
 *       Initialize multipart upload for large files (> 5MB).
 *       Supports videos and files up to 500MB.
 *
 *       Supported file types:
 *       - Videos: video/mp4, video/webm, video/quicktime, video/x-msvideo
 *       - Images: image/png, image/jpeg, image/webp
 *
 *       Flow:
 *       1. Call this API with fileName, fileSize, and mimeType
 *       2. Use returned signedUrl to upload file (PUT request)
 *       3. Call /complete-multipart to finalize
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileName
 *               - fileSize
 *               - mimeType
 *             properties:
 *               fileName:
 *                 type: string
 *                 example: myvideo.mp4
 *               fileSize:
 *                 type: number
 *                 example: 41943040
 *               mimeType:
 *                 type: string
 *                 example: video/mp4
 *     responses:
 *       200:
 *         description: Multipart upload initialized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Multipart upload initialized
 *                 data:
 *                   type: object
 *                   properties:
 *                     uploadId:
 *                       type: string
 *                     filePath:
 *                       type: string
 *                     signedUrl:
 *                       type: string
 *                     token:
 *                       type: string
 *                     uploadType:
 *                       type: string
 *                       example: multipart
 *                     maxSize:
 *                       type: number
 *       400:
 *         description: Invalid parameters or file too large
 */
router.post("/init-multipart", initMultipartUpload);

/**
 * @swagger
 * /api/upload/complete-multipart:
 *   post:
 *     summary: Complete multipart upload
 *     tags: [Upload]
 *     description: |
 *       Complete multipart upload for large files.
 *       Verifies file exists, validates type/size, and returns public URL.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - uploadId
 *               - filePath
 *             properties:
 *               uploadId:
 *                 type: string
 *               filePath:
 *                 type: string
 *               fileSize:
 *                 type: number
 *               mimeType:
 *                 type: string
 *     responses:
 *       200:
 *         description: Multipart upload completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     publicUrl:
 *                       type: string
 *                     size:
 *                       type: number
 *                     mimeType:
 *                       type: string
 *                     uploadType:
 *                       type: string
 *                       example: multipart
 *       400:
 *         description: Validation or upload failure
 */
router.post("/complete-multipart", completeMultipartUpload);

/**
 * @swagger
 * /api/upload/init-auto:
 *   post:
 *     summary: Initialize upload (auto-detect simple vs multipart)
 *     tags: [Upload]
 *     description: |
 *       ⭐ RECOMMENDED - Automatically choose upload method based on file size.
 *
 *       - Files ≤ 5MB → Simple upload flow
 *       - Files > 5MB → Multipart upload flow
 *
 *       Flow:
 *       1. Call this API with fileName, fileSize, mimeType
 *       2. Use returned signedUrl to upload (PUT request)
 *       3. Call /complete-auto to finalize
 *
 *       Supported file types:
 *       - Images: PNG, JPEG, WebP
 *       - Videos: MP4, WebM, MOV, AVI
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileName
 *               - fileSize
 *               - mimeType
 *             properties:
 *               fileName:
 *                 type: string
 *                 example: video.mp4
 *               fileSize:
 *                 type: number
 *                 description: File size in bytes
 *                 example: 41943040
 *               mimeType:
 *                 type: string
 *                 example: video/mp4
 *     responses:
 *       200:
 *         description: Upload initialized (simple or multipart)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Upload initialized (multipart)
 *                 data:
 *                   type: object
 *                   properties:
 *                     uploadId:
 *                       type: string
 *                     filePath:
 *                       type: string
 *                     signedUrl:
 *                       type: string
 *                     token:
 *                       type: string
 *                     uploadMethod:
 *                       type: string
 *                       example: multipart
 *                       enum: [simple, multipart]
 *                     autoDetected:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Invalid parameters
 */
router.post("/init-auto", initUploadAuto);

/**
 * @swagger
 * /api/upload/complete-auto:
 *   post:
 *     summary: Complete upload (auto-detect simple vs multipart)
 *     tags: [Upload]
 *     description: |
 *       ⭐ RECOMMENDED - Automatically finalize upload.
 *
 *       Automatically determines if file was uploaded via simple or multipart,
 *       verifies existence, validates type/size, and returns public URL.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - uploadId
 *               - filePath
 *             properties:
 *               uploadId:
 *                 type: string
 *               filePath:
 *                 type: string
 *               fileSize:
 *                 type: number
 *                 description: Optional, used for auto-detection
 *               mimeType:
 *                 type: string
 *               uploadMethod:
 *                 type: string
 *                 enum: [simple, multipart]
 *                 description: Optional, if known
 *     responses:
 *       200:
 *         description: Upload completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     publicUrl:
 *                       type: string
 *                     size:
 *                       type: number
 *                     mimeType:
 *                       type: string
 *                     uploadMethod:
 *                       type: string
 *                       enum: [simple, multipart]
 *       400:
 *         description: Validation or upload failure
 */
router.post("/complete-auto", completeUploadAuto);

/**
 *     tags: [Upload]
 *     description: |
 *       ⚠️ This endpoint is ONLY for Swagger testing.
 *       It bypasses signed URL flow and uploads directly.
 *
 *       Use this only to test file uploads inside Swagger UI.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *       500:
 *         description: Upload failed
 */
router.post("/test", (req, res) => {
  res.status(501).json({
    message: "Test upload not implemented yet",
  });
});

export default router;