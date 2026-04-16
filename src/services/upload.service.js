import { supabaseAdmin } from "../config/supabase.js";
import { v4 as uuidv4 } from "uuid";

const bucket = process.env.SUPABASE_BUCKET;

// ✅ Allowed MIME types - Images
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

// ✅ Allowed MIME types - Videos
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];

// ✅ All allowed types
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

// ✅ Max file size for simple upload (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// ✅ Max file size for multipart upload (500MB)
const MAX_MULTIPART_FILE_SIZE = 500 * 1024 * 1024;

// ✅ Minimum file size to use multipart upload (10MB)
const MULTIPART_THRESHOLD = 10 * 1024 * 1024;

export const initUploadService = async ({ fileName }) => {
  const id = uuidv4();
  const filePath = `${id}-${fileName}`;

  // Create DB entry
  const { error } = await supabaseAdmin.from("uploads").insert({
    id,
    file_name: fileName,
    file_path: filePath,
    status: "pending",
  });

  if (error) throw error;

  // Generate signed upload URL
  const { data, error: urlError } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUploadUrl(filePath);

  if (urlError) throw urlError;

  return {
    uploadId: id,
    filePath,
    signedUrl: data.signedUrl,
    token: data.token,
  };
};

export const completeUploadService = async ({ uploadId, filePath }) => {
  try {
    // 🔍 Verify file exists in storage
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from(bucket)
      .list("", {
        search: filePath,
      });

    if (listError) throw listError;

    const file = files?.find((f) => f.name === filePath);

    if (!file) {
      await supabaseAdmin
        .from("uploads")
        .update({ status: "failed" })
        .eq("id", uploadId);

      throw new Error("File not found in storage (upload may have failed)");
    }

    // 📊 Extract metadata
    const size = file.metadata?.size || 0;
    const mimeType = file.metadata?.mimetype || "unknown";

    // 🚫 Validate file type
    if (!ALLOWED_TYPES.includes(mimeType)) {
      await supabaseAdmin
        .from("uploads")
        .update({ status: "failed" })
        .eq("id", uploadId);

      throw new Error(`Invalid file type: ${mimeType}`);
    }

    // 🚫 Validate file size
    if (size > MAX_FILE_SIZE) {
      await supabaseAdmin
        .from("uploads")
        .update({ status: "failed" })
        .eq("id", uploadId);

      throw new Error(`File too large. Max allowed is ${MAX_FILE_SIZE} bytes`);
    }

    // 🔗 Get public URL
    const { data: publicData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(filePath);

    // ✅ Update DB
    const { error: updateError } = await supabaseAdmin
      .from("uploads")
      .update({
        status: "uploaded",
        public_url: publicData.publicUrl,
        size,
        mime_type: mimeType,
      })
      .eq("id", uploadId);

    if (updateError) throw updateError;

    return {
      publicUrl: publicData.publicUrl,
      size,
      mimeType,
      status: "uploaded",
    };
  } catch (err) {
    // ❌ Fail-safe update
    await supabaseAdmin
      .from("uploads")
      .update({ status: "failed" })
      .eq("id", uploadId);

    throw err;
  }
};

// ✅ INIT MULTIPART UPLOAD
export const initMultipartUploadService = async ({ fileName, fileSize, mimeType }) => {
  // 🚫 Validate file size
  if (fileSize > MAX_MULTIPART_FILE_SIZE) {
    throw new Error(
      `File too large. Max allowed is ${MAX_MULTIPART_FILE_SIZE / (1024 * 1024)}MB`
    );
  }

  // 🚫 Validate file type
  if (!ALLOWED_TYPES.includes(mimeType)) {
    throw new Error(`File type not allowed: ${mimeType}`);
  }

  const id = uuidv4();
  const filePath = `${id}-${fileName}`;

  try {
    // Create DB entry for multipart upload
    const { error } = await supabaseAdmin.from("uploads").insert({
      id,
      file_name: fileName,
      file_path: filePath,
      status: "pending",
      upload_type: "multipart",
      file_size: fileSize,
      mime_type: mimeType,
    });

    if (error) throw error;

    // Generate signed upload URL for multipart
    const { data, error: urlError } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUploadUrl(filePath);

    if (urlError) throw urlError;

    return {
      uploadId: id,
      filePath,
      signedUrl: data.signedUrl,
      token: data.token,
      uploadType: "multipart",
      maxSize: MAX_MULTIPART_FILE_SIZE,
    };
  } catch (err) {
    // Cleanup on error
    await supabaseAdmin.from("uploads").delete().eq("id", id).catch(() => {});
    throw err;
  }
};

// ✅ COMPLETE MULTIPART UPLOAD
export const completeMultipartUploadService = async ({
  uploadId,
  filePath,
  fileSize,
  mimeType,
}) => {
  try {
    // 🔍 Verify file exists in storage
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from(bucket)
      .list("", {
        search: filePath,
      });

    if (listError) throw listError;

    const file = files?.find((f) => f.name === filePath);

    if (!file) {
      await supabaseAdmin
        .from("uploads")
        .update({ status: "failed" })
        .eq("id", uploadId);

      throw new Error("File not found in storage (upload may have failed)");
    }

    // 📊 Extract metadata
    const actualSize = file.metadata?.size || fileSize || 0;
    const actualMimeType = file.metadata?.mimetype || mimeType || "unknown";

    // 🚫 Validate file type
    if (!ALLOWED_TYPES.includes(actualMimeType)) {
      await supabaseAdmin
        .from("uploads")
        .update({ status: "failed" })
        .eq("id", uploadId);

      throw new Error(`Invalid file type: ${actualMimeType}`);
    }

    // 🚫 Validate file size
    if (actualSize > MAX_MULTIPART_FILE_SIZE) {
      await supabaseAdmin
        .from("uploads")
        .update({ status: "failed" })
        .eq("id", uploadId);

      throw new Error(
        `File too large. Max allowed is ${MAX_MULTIPART_FILE_SIZE / (1024 * 1024)}MB`
      );
    }

    // 🔗 Get public URL
    const { data: publicData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(filePath);

    // ✅ Update DB
    const { error: updateError } = await supabaseAdmin
      .from("uploads")
      .update({
        status: "uploaded",
        public_url: publicData.publicUrl,
        size: actualSize,
        mime_type: actualMimeType,
        upload_type: "multipart",
      })
      .eq("id", uploadId);

    if (updateError) throw updateError;

    return {
      publicUrl: publicData.publicUrl,
      size: actualSize,
      mimeType: actualMimeType,
      status: "uploaded",
      uploadType: "multipart",
    };
  } catch (err) {
    // ❌ Fail-safe update
    await supabaseAdmin
      .from("uploads")
      .update({ status: "failed" })
      .eq("id", uploadId)
      .catch(() => {});

    throw err;
  }
};