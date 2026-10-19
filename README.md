# MediaNest — High-Performance Media Converter & Utility Platform

MediaNest is a production-minded web application engineered for converting, optimizing, inspecting, remuxing, and extracting audio and video from authorized media files and permitted direct streams. Built with Next.js App Router, TypeScript (strict mode), and native FFmpeg/FFprobe process management.

---

## 🎯 Key Capabilities

1. **Native FFmpeg Transcoding Pipeline**
   - Transcode between major containers: MP4 (`libx264`), WebM (`libvpx-vp9`), MKV, MP3 (`libmp3lame`), WAV (`pcm_s16le`), AAC, OGG (`libvorbis`), and FLAC.
   - Configurable audio bitrates: `128k`, `192k`, `256k`, `320k` with sample rate adjustments (44.1 kHz, 48.0 kHz).
   - Video resolution scaling presets: `original`, `1080p` (Full HD), `720p` (HD), `480p` (SD).
   - Video container web optimization via `-movflags +faststart` for instant streaming.

2. **Lossless Stream Remuxing (Stream Copy)**
   - Automatically detects when source streams can be packaged into target containers without re-encoding (e.g. H.264/AAC MKV to MP4, or AAC from MP4 to M4A) using `-c copy`.
   - Prevents generation loss, speeds up processing by orders of magnitude, and eliminates quality degradation.

3. **Audio Extraction & Soundtrack Demuxing**
   - 1-click video soundtrack extraction to MP3, M4A/AAC, WAV, or FLAC.
   - Detects incompatible streams before processing (e.g., rejecting audio extraction on silent video files).

4. **Fidelity Transparency & Quality Honesty**
   - Detects bitrate inflation attempts (e.g. converting a 128 kbps source to 320 kbps) and alerts users that up-encoding cannot restore frequencies lost during lossy compression and only increases file size.
   - Prevents meaningless resolution upscaling beyond the native source dimensions.

5. **Concurrency-Limited Asynchronous Job Queue**
   - Enforces configurable server-wide concurrency limits (`MAX_CONCURRENT_JOBS`) to prevent CPU exhaustion.
   - FIFO queue management with real-time job status tracking (`queued`, `processing`, `completed`, `failed`, `cancelled`, `expired`).
   - Machine-readable progress tracking parsed directly from FFmpeg's `-progress pipe:1` stream.
   - Strict output verification: validates output file existence, non-zero byte size, and full structural validity via FFprobe before marking any job completed.
   - Graceful job cancellation with process termination (`SIGKILL`) and partial file cleanup.

6. **Active File Reference Protection & Safe Delivery**
   - Prevents deletion or premature expiration of files that are currently queued or being converted by active jobs.
   - Ephemeral staging storage with automatic TTL-based cleanup.
   - Safe streaming downloads with `Content-Disposition: attachment` headers, strict MIME types, and path traversal protection.

7. **Direct Permitted Media Downloader & Anti-SSRF Shield**
   - Supports authorized public media sources (Wikimedia Commons, Internet Archive, LibriVox, Google Actions samples).
   - Blocks private IP ranges (RFC1918), loopback (`127.0.0.1`, `localhost`), link-local, cloud metadata services (`169.254.169.254`), and unauthorized proprietary domains.

---

## 🛡️ Fair Use, Compliance & Security Policy

MediaNest strictly enforces content ownership rules and platform guidelines:
- **Authorized Media Only:** Exclusively processes files uploaded directly by users or remote files permitted by content owners.
- **No DRM Circumvention:** Does not bypass access controls, encryption, or digital rights management mechanisms.
- **No Unauthorized Platform Scraping:** Does not implement YouTube extraction, TikTok scraping, or platform access-control bypasses.
- **Zero Command Concatenation:** FFmpeg and FFprobe processes are invoked strictly via safe argument arrays (`spawn`/`execFile`), never raw shell strings.
- **Privacy by Design:** Staged media files are stored temporarily in isolated staging directories with random UUIDs and purged automatically. No secrets, absolute internal filesystem paths, or raw stack traces are ever exposed in public API responses.

---

## 🛠️ Technology Stack

- **Framework:** Next.js 16 (App Router with Server Components & Route Handlers)
- **Language:** TypeScript 5 (Strict Mode enabled)
- **Styling:** Tailwind CSS v4 with custom design tokens
- **Media Engine:** Native FFmpeg & FFprobe child processes with path configuration
- **Validation:** Zod for server-side schema verification and SSRF filtering
- **Icons:** Lucide React
- **Unit Testing:** Vitest with React Testing Library and JSDOM (72 tests)
- **End-to-End Testing:** Playwright with Chromium (10 tests)

---

## 📦 FFmpeg Installation Guide

MediaNest requires **FFmpeg** and **FFprobe** to process media files. If either binary is missing, the application safely halts and returns a clear `503 FFMPEG_NOT_CONFIGURED` error instead of faking results.

### Windows Installation

#### Option A: Via Windows Package Manager (Winget - Recommended)
Open PowerShell and run:
```powershell
winget install Gyan.FFmpeg
```
Restart PowerShell or your terminal after installation so `ffmpeg` and `ffprobe` are added to your system `PATH`.

#### Option B: Via Chocolatey
```powershell
choco install ffmpeg
```

#### Option C: Manual Download (gyan.dev)
1. Download the latest "essentials build" zip from [gyan.dev/ffmpeg/builds](https://www.gyan.dev/ffmpeg/builds/).
2. Extract the archive (e.g. to `C:\ffmpeg`).
3. Add `C:\ffmpeg\bin` to your system Environment Variables (`PATH`), or configure custom paths in your `.env.local` file:
   ```env
   FFMPEG_PATH="C:\ffmpeg\bin\ffmpeg.exe"
   FFPROBE_PATH="C:\ffmpeg\bin\ffprobe.exe"
   ```

### Linux Installation

#### Ubuntu / Debian
```bash
sudo apt update
sudo apt install -y ffmpeg
```

#### Fedora / RHEL / CentOS
```bash
sudo dnf install -y ffmpeg ffmpeg-free-devel
```

#### Arch Linux
```bash
sudo pacman -S ffmpeg
```

### macOS Installation
```bash
brew install ffmpeg
```

### Verifying Installation
Verify that both executables are accessible:
```bash
ffmpeg -version
ffprobe -version
```

---

## ⚙️ Environment Variables Reference

Configure these settings in `.env.local` (see `.env.example` for a starter template):

| Variable | Type | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | string | `"MediaNest"` | Application and brand name displayed across UI |
| `NEXT_PUBLIC_APP_URL` | string | `"http://localhost:3000"` | Base URL of the application |
| `FFMPEG_PATH` | string | `""` | Optional explicit path to the `ffmpeg` binary |
| `FFPROBE_PATH` | string | `""` | Optional explicit path to the `ffprobe` binary |
| `MAX_CONCURRENT_JOBS` | number | `2` | Maximum number of concurrent FFmpeg jobs processed simultaneously |
| `MAX_OUTPUT_SIZE_BYTES`| number | `524288000` | Hard cutoff on generated file size in bytes (500 MB default) |
| `MAX_PROCESSING_TIMEOUT_MS`| number | `300000` | Maximum transcoding execution duration in milliseconds (5 min default) |
| `TEMP_MEDIA_DIR` | string | `"./.temp_media"` | Path to the local ephemeral media directory |
| `MAX_UPLOAD_SIZE_MB` | number | `250` | Maximum file upload size in megabytes |
| `MAX_REMOTE_DOWNLOAD_SIZE_MB` | number | `200` | Maximum size for remote direct downloads |
| `MEDIA_CLEANUP_INTERVAL_MINUTES` | number | `30` | Interval for purging expired staged media |
| `ENABLE_SSRF_PROTECTION` | boolean | `true` | Restricts remote URLs to public IPs and allowed providers |
| `ALLOWED_MEDIA_PROVIDERS` | string | `""` | Comma-separated domains to allow for remote fetching |

---

## 🔄 Remuxing vs. Re-encoding (Transcoding)

MediaNest automatically analyzes input media and distinguishes between **lossless remuxing** and **transcoding**:

| Operation | Strategy | Quality Impact | Speed | Example |
|---|---|---|---|---|
| **Remuxing (Stream Copy)** | `-c copy` | **0% Loss (100% Bit-for-bit)** | Near instantaneous | MKV containing H.264+AAC to MP4 container |
| **Audio Demuxing** | `-c:a copy` | **0% Loss (Original bitstream)** | Seconds | Extracting AAC audio from MP4 to M4A |
| **Transcoding** | Codec encode | Minor generation loss | CPU bound | Converting MP4 video to WebM (VP9/Opus) |
| **Audio Re-encoding**| Codec encode | Generation loss if lossy source | Moderate | Converting AAC or OGG to MP3 (libmp3lame) |

### Fidelity Notice on Bitrate
Increasing the bitrate (e.g. selecting 320 kbps for a 128 kbps source file) **cannot reconstruct** high frequencies or clarity lost during the original lossy compression. It only increases the final file size. MediaNest transparently flags this with a `fidelityNotice` in the job response.

---

## 📡 API Reference & Examples

### 1. Upload Staged Media File
Upload a user-owned media file for inspection and conversion.

```bash
curl -X POST http://localhost:3000/api/media/upload \
  -F "file=@sample_recording.mp4"
```

**Response (201 Created):**
```json
{
  "success": true,
  "record": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "filename": "sample_recording.mp4",
    "size": 5242880,
    "mimeType": "video/mp4",
    "createdAt": 1729000000000,
    "expiresAt": 1729003600000
  }
}
```

---

### 2. Analyze Media File or URL
Probe stream details and calculate technically supported output options.

```bash
curl -X POST http://localhost:3000/api/media/analyze \
  -H "Content-Type: application/json" \
  -d '{"fileId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"}'
```

**Response (200 OK):**
```json
{
  "success": true,
  "metadata": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "filename": "sample_recording.mp4",
    "format": "mov,mp4,m4a,3gp,3g2,mj2",
    "duration": 42.5,
    "size": 5242880,
    "hasAudio": true,
    "hasVideo": true,
    "videoCodec": "h264",
    "audioCodec": "aac",
    "videoWidth": 1920,
    "videoHeight": 1080,
    "videoFps": 30
  },
  "capabilities": {
    "hasVideo": true,
    "hasAudio": true,
    "availableFormats": ["mp4", "webm", "mkv", "mp3", "m4a", "wav", "flac"],
    "availableResolutions": ["original", "1080p", "720p", "480p"],
    "availableBitrates": ["128k", "192k", "256k", "320k"],
    "recommendedFormat": "mp4"
  }
}
```

---

### 3. Create Asynchronous Transcoding Job
Queue a conversion job. MediaNest validates source stream compatibility, determines whether remuxing or transcoding applies, and dispatches the task according to the concurrency limit.

```bash
curl -X POST http://localhost:3000/api/media/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "targetFormat": "mp3",
    "audioBitrate": "192k"
  }'
```

**Response (201 Created):**
```json
{
  "success": true,
  "job": {
    "id": "7b134d12-14cf-42ec-a05d-6f7d2bc50e41",
    "status": "queued",
    "progress": 0,
    "createdAt": 1729000005000,
    "targetFormat": "mp3",
    "sourceFilename": "sample_recording.mp4",
    "strategy": "transcode",
    "fidelityNotice": null
  }
}
```

---

### 4. Poll Job Status
Query the real-time progress and verification status of a job.

```bash
curl -X GET http://localhost:3000/api/media/jobs/7b134d12-14cf-42ec-a05d-6f7d2bc50e41
```

**Response (200 OK — Completed):**
```json
{
  "success": true,
  "job": {
    "id": "7b134d12-14cf-42ec-a05d-6f7d2bc50e41",
    "status": "completed",
    "progress": 100,
    "createdAt": 1729000005000,
    "updatedAt": 1729000007500,
    "expiresAt": 1729003605000,
    "sourceFilename": "sample_recording.mp4",
    "targetFormat": "mp3",
    "strategy": "transcode",
    "outputFilename": "sample_recording_converted.mp3",
    "outputSize": 1024500,
    "downloadUrl": "/api/media/jobs/7b134d12-14cf-42ec-a05d-6f7d2bc50e41/download",
    "timeMs": 2450
  }
}
```

---

### 5. Download Converted Media
Stream the finished media file with attachment headers.

```bash
curl -O -J http://localhost:3000/api/media/jobs/7b134d12-14cf-42ec-a05d-6f7d2bc50e41/download
```

**Response Headers:**
```http
HTTP/1.1 200 OK
Content-Type: audio/mpeg
Content-Length: 1024500
Content-Disposition: attachment; filename="sample_recording_converted.mp3"
Cache-Control: private, no-cache, no-store, must-revalidate
X-Content-Type-Options: nosniff
```

---

### 6. Cancel Active Job
Terminate the running FFmpeg child process and clean up partial files.

```bash
curl -X DELETE http://localhost:3000/api/media/jobs/7b134d12-14cf-42ec-a05d-6f7d2bc50e41
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Job cancelled and associated media files purged."
}
```

---

### 7. Engine Health Diagnostic
Check operational readiness of the server and FFmpeg/FFprobe binaries.

```bash
curl -X GET http://localhost:3000/api/health
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "engine": {
    "ffmpeg": true,
    "ffprobe": true,
    "ffmpegVersion": "ffmpeg version 6.1.1...",
    "ffprobeVersion": "ffprobe version 4.0.2..."
  },
  "timestamp": "2026-10-15T11:15:00.000Z"
}
```

---

## 🚀 Setup & Local Execution

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
```

### 3. Run Development Server
```bash
npm run dev
```
Navigate to [http://localhost:3000](http://localhost:3000).

---

## 🌐 SEO Foundation & Canonical Architecture

MediaNest implements an enterprise-grade technical SEO architecture adhering to modern search engine guidelines without doorway pages or misleading claims:

### 1. Canonical Pages (11 Total)
- `/`: Primary interactive Media Studio with Hero and converter tabs.
- `/video-downloader`: Direct HTTP/HTTPS media stream analyzer and remuxer.
- `/audio-converter`: Audio transcoding guide and high-fidelity extractor.
- `/mp4-converter`: Universal H.264 / AAC video container converter with FastStart.
- `/mp3-converter`: Reference LAME MP3 audio transcoder with 128k/192k/320k CBR profiles.
- `/supported-formats`: Comprehensive codec matrix, container limits, and quotas.
- `/how-it-works`: 4-stage pipeline (ingestion, probing, FFmpeg workers, ephemeral purge).
- `/faq`: Categorized knowledge base with matching `FAQPage` schema.
- `/privacy`: Data handling policy detailing 15-minute TTL and zero tracking.
- `/terms`: Acceptable use policy, copyright ownership, and DRM prohibitions.
- `/contact`: Direct engineering support, bug reporting, and self-service diagnostics.

### 2. Technical SEO Implementation
- **Metadata API & Base URL:** Configured via `NEXT_PUBLIC_SITE_URL` in `src/config/site.ts` with Open Graph and Twitter Card tags.
- **Dynamic Crawler Directives:** Built-in `src/app/robots.ts` and `src/app/sitemap.ts` dynamic routes.
- **Structured Data (JSON-LD):** XSS-sanitized schemas for `WebSite`, `Organization`, `BreadcrumbList`, and `FAQPage`.
- **Accessible Breadcrumbs:** Semantic `<nav aria-label="Breadcrumb">` matching `BreadcrumbList` schemas on all content pages.

---

## 🧪 Verification & Test Suite

### Run Vitest Unit & Component Tests
```bash
npm test
```
Executes all **87 unit and component tests** covering:
- Format conversion utilities and filename sanitizers
- Zod request schemas and SSRF security filters
- Magic-byte media signature detection
- Format capabilities, stream compatibility, and fidelity notices
- FFmpeg argument generation for lossless remuxing vs transcoding
- Missing binary configuration errors (`503 FFMPEG_NOT_CONFIGURED`)
- Job cancellation, concurrency limits, and output verification
- Active file reference protection in storage (`409 FILE_IN_USE`)
- Reusable UI component rendering and states
- MediaResultCard polling state machine and client API abstractions

### Run Playwright End-to-End Tests
```bash
npx playwright test
```
Executes all **24 Playwright E2E tests** validating:
- Homepage rendering, hero controls, and clipboard paste interaction
- Navigation links, FAQ accordions, and compliance disclaimers
- SSRF and YouTube URL rejection
- Full end-to-end transcoding lifecycle (`sample -> analyze -> job -> poll -> download -> delete`)
- All 11 canonical pages (HTTP 200, valid `<h1>`, canonical `<link>`, and meta descriptions)
- Dynamic `robots.txt` directives (disallowing `/api/` and `/_next/`)
- Dynamic `sitemap.xml` containing all canonical URLs
- JSON-LD structured data extraction and validity

### Run Type Checking & Linter
```bash
npm run lint
npx tsc --noEmit
```

### Production Build
```bash
npm run build
npm start
```
