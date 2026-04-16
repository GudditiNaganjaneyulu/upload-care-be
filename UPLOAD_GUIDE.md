# Upload Guide - With Multipart Support

## Overview

This upload service now supports **automatic file size detection** for seamless uploads:
- **Automatic routing** - Uploads ≤5MB use simple flow, larger files use multipart
- **Simple uploads** - Up to 5MB for images (PNG, JPEG, WebP)
- **Multipart uploads** - Up to 500MB for images and videos

---

## 🎯 Recommended: Auto-Detection Flow

Simply provide file metadata and the system automatically chooses the best approach:

```
POST /api/upload/init-auto (detects size)
  ↓
Automatic routing: simple or multipart?
  ↓
PUT to signedUrl with file
  ↓
POST /api/upload/complete-auto (auto-finalizes)
```

**This is the simplest approach - recommended for all cases.**

---

## File Size Limits

| Upload Type | Max Size | Use Case |
|-------------|----------|----------|
| **Simple Upload** | 5MB | Small images (PNG, JPEG, WebP) |
| **Multipart Upload** | 500MB | Large files, videos (MP4, WebM, etc.) |

---

## Supported File Types

### Simple Upload (5MB max)
- ✅ `image/png`
- ✅ `image/jpeg`
- ✅ `image/webp`

### Multipart Upload (500MB max)
- ✅ `image/png`, `image/jpeg`, `image/webp`
- ✅ `video/mp4`
- ✅ `video/webm`
- ✅ `video/quicktime` (MOV)
- ✅ `video/x-msvideo` (AVI)

---

## Upload Flows

### ⭐ Flow 0: AUTO-DETECT (Recommended)

**Automatically routes to simple or multipart based on file size.**

```bash
# Step 1: Initialize (auto-detection happens here)
curl -X POST http://localhost:3000/api/upload/init-auto \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "myvideo.mp4",
    "fileSize": 41943040,
    "mimeType": "video/mp4"
  }'

# Response:
{
  "status": "success",
  "message": "Upload initialized (multipart)",
  "data": {
    "uploadId": "uuid-456",
    "filePath": "uuid-456-myvideo.mp4",
    "signedUrl": "https://...",
    "token": "...",
    "uploadMethod": "multipart",  # ← Auto-detected!
    "autoDetected": true,
    "fileSizeThreshold": 5242880
  }
}

# Step 2: Upload file (same for both methods)
curl -X PUT https://... \
  -H "Authorization: Bearer token" \
  --data-binary @myvideo.mp4

# Step 3: Complete (auto-detection happens here too)
curl -X POST http://localhost:3000/api/upload/complete-auto \
  -H "Content-Type: application/json" \
  -d '{
    "uploadId": "uuid-456",
    "filePath": "uuid-456-myvideo.mp4",
    "fileSize": 41943040,
    "mimeType": "video/mp4"
  }'

# Response:
{
  "status": "success",
  "message": "Upload completed",
  "data": {
    "publicUrl": "https://...",
    "size": 41943040,
    "mimeType": "video/mp4",
    "uploadMethod": "multipart",
    "autoDetected": true,
    "status": "uploaded"
  }
}
```

---

### Flow 1: Simple Upload (≤ 5MB images)

```
1. POST /api/upload/init
   └─ Get: uploadId, filePath, signedUrl, token

2. Client uploads directly using signedUrl
   └─ PUT request with file

3. POST /api/upload/complete
   └─ Get: publicUrl, size, mimeType
```

**Example:**

```bash
# Step 1: Initialize
curl -X POST http://localhost:3000/api/upload/init \
  -H "Content-Type: application/json" \
  -d '{"fileName": "photo.jpg"}'

# Response:
{
  "status": "success",
  "data": {
    "uploadId": "uuid-123",
    "filePath": "uuid-123-photo.jpg",
    "signedUrl": "https://...",
    "token": "..."
  }
}

# Step 2: Upload file using signedUrl
curl -X PUT https://... \
  -H "Authorization: Bearer token" \
  --data-binary @photo.jpg

# Step 3: Complete upload
curl -X POST http://localhost:3000/api/upload/complete \
  -H "Content-Type: application/json" \
  -d '{
    "uploadId": "uuid-123",
    "filePath": "uuid-123-photo.jpg"
  }'

# Response:
{
  "status": "success",
  "data": {
    "publicUrl": "https://...",
    "size": 2048000,
    "mimeType": "image/jpeg",
    "status": "uploaded"
  }
}
```

---

### Flow 2: Multipart Upload (> 5MB files, including videos)

```
1. POST /api/upload/init-multipart
   ├─ Input: fileName, fileSize, mimeType
   └─ Get: uploadId, filePath, signedUrl, uploadType, maxSize

2. Client uploads directly using signedUrl
   └─ PUT request with file

3. POST /api/upload/complete-multipart
   └─ Get: publicUrl, size, mimeType, uploadType
```

**Example: Upload 40MB Video**

```bash
# Step 1: Initialize multipart upload
curl -X POST http://localhost:3000/api/upload/init-multipart \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "myvideo.mp4",
    "fileSize": 41943040,
    "mimeType": "video/mp4"
  }'

# Response:
{
  "status": "success",
  "message": "Multipart upload initialized",
  "data": {
    "uploadId": "uuid-456",
    "filePath": "uuid-456-myvideo.mp4",
    "signedUrl": "https://...",
    "token": "...",
    "uploadType": "multipart",
    "maxSize": 524288000
  }
}

# Step 2: Upload file using signedUrl
curl -X PUT https://... \
  -H "Authorization: Bearer token" \
  --data-binary @myvideo.mp4

# Step 3: Complete multipart upload
curl -X POST http://localhost:3000/api/upload/complete-multipart \
  -H "Content-Type: application/json" \
  -d '{
    "uploadId": "uuid-456",
    "filePath": "uuid-456-myvideo.mp4",
    "fileSize": 41943040,
    "mimeType": "video/mp4"
  }'

# Response:
{
  "status": "success",
  "message": "Multipart upload completed",
  "data": {
    "publicUrl": "https://...",
    "size": 41943040,
    "mimeType": "video/mp4",
    "uploadType": "multipart",
    "status": "uploaded"
  }
}
```

---

## Client-Side Implementation

### ⭐ RECOMMENDED: Auto-Detection (Simplest)

```javascript
// Just send file metadata, backend auto-detects and handles everything
const uploadFile = async (file) => {
  const fileName = file.name;
  const fileSize = file.size;
  const mimeType = file.type;

  // Step 1: Initialize (auto-detects size and chooses method)
  const initRes = await fetch('http://localhost:3000/api/upload/init-auto', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, fileSize, mimeType })
  });

  const { data } = await initRes.json();
  const { uploadId, filePath, signedUrl, token, uploadMethod } = data;
  
  console.log(`File will be uploaded via: ${uploadMethod}`);

  // Step 2: Upload file (works for both simple and multipart)
  const uploadRes = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` },
    body: file
  });

  if (!uploadRes.ok) throw new Error('Upload failed');

  // Step 3: Complete (auto-detects and finalizes)
  const completeRes = await fetch('http://localhost:3000/api/upload/complete-auto', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uploadId, filePath, fileSize, mimeType })
  });

  const result = await completeRes.json();
  console.log('Upload complete:', result.data.publicUrl);
  return result;
};
```

### MANUAL: Explicit Control (if preferred)

```javascript
const uploadFile = async (file) => {
  const fileSize = file.size;
  const fileName = file.name;
  const mimeType = file.type;

  // Determine upload type based on file size
  const isMultipart = fileSize > 5 * 1024 * 1024; // > 5MB

  if (isMultipart) {
    // Use multipart upload for large files
    const initRes = await fetch('http://localhost:3000/api/upload/init-multipart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, fileSize, mimeType })
    });

    const { data } = await initRes.json();
    const { uploadId, filePath, signedUrl, token } = data;

    // Upload file
    const uploadRes = await fetch(signedUrl, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
      body: file
    });

    if (!uploadRes.ok) throw new Error('Upload failed');

    // Complete upload
    const completeRes = await fetch('http://localhost:3000/api/upload/complete-multipart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId, filePath, fileSize, mimeType })
    });

    return await completeRes.json();
  } else {
    // Use simple upload for small files
    // ... (existing simple upload flow)
  }
};
```

---

## Error Handling

Common error scenarios:

```javascript
// File too large for multipart
{
  "status": "error",
  "message": "File too large. Max allowed is 500MB"
}

// Invalid file type
{
  "status": "error",
  "message": "File type not allowed: application/pdf"
}

// File not found during completion
{
  "status": "failed",
  "message": "File not found in storage (upload may have failed)"
}

// Missing required parameters
{
  "status": "error",
  "message": "fileName, fileSize, and mimeType are required"
}
```

---

## Database Schema

The `uploads` table now includes:

- `id` - Upload ID (UUID)
- `file_name` - Original filename
- `file_path` - Storage path
- `status` - pending | uploaded | failed
- `public_url` - Public accessible URL
- `size` - File size in bytes
- `mime_type` - File MIME type
- `upload_type` - simple | multipart
- `file_size` - Expected file size (for multipart)

---

## Best Practices

✅ **DO:**
- Check file size before choosing upload method
- Send `mimeType` with multipart uploads
- Handle network errors gracefully
- Show upload progress to users

❌ **DON'T:**
- Upload files > 500MB (not supported)
- Use simple upload for files > 5MB (use multipart instead)
- Forget to call `/complete` or `/complete-multipart`
- Assume files are uploaded without calling completion endpoints

---

## Notes

- All existing functionality remains unchanged
- Simple upload still works for images up to 5MB
- Backward compatible with existing code
- Multipart upload provides failsafe with automatic rollback on errors
