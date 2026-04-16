# Upload Care

A secure backend API for file uploads using Supabase Storage with signed URLs. This system allows clients to upload images directly to Supabase without exposing sensitive credentials.

## Features

- **Signed URL Uploads**: Secure, direct-to-storage uploads without server intermediaries.
- **File Validation**: Supports PNG, JPEG, and WebP images up to 5MB.
- **Database Tracking**: Tracks upload status, metadata, and public URLs in PostgreSQL.
- **Swagger Documentation**: Interactive API docs at `/api-docs`.
- **CORS Enabled**: Supports cross-origin requests.
- **Error Handling**: Comprehensive error responses and logging.

## Tech Stack

- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL (via Supabase)
- **Storage**: Supabase Storage
- **Documentation**: Swagger/OpenAPI
- **Environment**: ES Modules

## Setup Instructions

### Prerequisites
- Node.js (v16+)
- Supabase account and project
- PostgreSQL database (Supabase provides this)

### 1. Clone and Install
```bash
git clone https://github.com/GudditiNaganjaneyulu/upload-care.git
cd upload-care
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_BUCKET=upload
PORT=5000
```

- Get these values from your Supabase project dashboard (Settings > API).
- Create a storage bucket named `upload` in Supabase Storage.

### 3. Database Setup
Run the migration script in your Supabase SQL editor or psql:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

create table if not exists uploads (
  id uuid primary key default uuid_generate_v4(),
  file_name text not null,
  file_path text not null unique,
  mime_type text,
  size int,
  status text default 'pending' check (status in ('pending','uploaded','failed')),
  public_url text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- auto update timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
   new.updated_at = now();
   return new;
end;
$$ language plpgsql;

create trigger set_updated_at
before update on uploads
for each row
execute procedure update_updated_at_column();
```

### 4. Run the Application
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`.

## API Usage

### Upload Flow
1. **Initialize Upload** (`POST /api/upload/init`)
2. **Upload File** (PUT to signed URL)
3. **Complete Upload** (`POST /api/upload/complete`)

### Endpoints

#### POST /api/upload/init
Initializes an upload and generates a signed URL.

**Request Body:**
```json
{
  "fileName": "example.png"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Upload initialized",
  "data": {
    "uploadId": "uuid",
    "filePath": "uuid-example.png",
    "signedUrl": "https://...",
    "token": "token"
  }
}
```

#### PUT {signedUrl}
Upload the file directly to Supabase Storage.

- **Method**: PUT
- **Body**: Binary file data
- **Headers**: `Content-Type: image/png` (or appropriate MIME type)

**Response:** `{"Key": "upload/uuid-example.png"}`

#### POST /api/upload/complete
Verifies the upload and provides the public URL.

**Request Body:**
```json
{
  "uploadId": "uuid",
  "filePath": "uuid-example.png"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Upload completed",
  "data": {
    "publicUrl": "https://...",
    "size": 12345,
    "mimeType": "image/png",
    "status": "uploaded"
  }
}
```

## Testing with Postman

Import the `postman.json` collection into Postman. It includes:
- Init Upload
- Upload File (PUT to signed URL)
- Complete Upload

Set the `baseUrl` variable to `http://localhost:5000` for local testing or `https://upload-care.onrender.com` for production.

### Example Curl Commands

**Init Upload:**
```bash
curl -X POST http://localhost:5000/api/upload/init \
  -H "Content-Type: application/json" \
  -d '{"fileName": "test.png"}'
```

**Complete Upload:**
```bash
curl -X POST http://localhost:5000/api/upload/complete \
  -H "Content-Type: application/json" \
  -d '{"uploadId": "your-uuid", "filePath": "your-file-path"}'
```

## File Validation Rules

- **Allowed Types**: `image/png`, `image/jpeg`, `image/webp`
- **Max Size**: 5MB
- **Naming**: Files are prefixed with a UUID for uniqueness

## Deployment

This app is deployed on Render.com. For your own deployment:

1. Push to GitHub
2. Connect to Render (Web Service)
3. Set environment variables in Render dashboard
4. Deploy

## Contributing

1. Fork the repo
2. Create a feature branch
3. Make changes
4. Test thoroughly
5. Submit a PR

## License

ISC