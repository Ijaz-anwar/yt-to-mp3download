# MediaNest — High-Performance Media Converter & Utility Website

MediaNest is a production-minded web application engineered for converting, optimizing, inspecting, and extracting audio and video from authorized media files and permitted direct streams. Built on Next.js App Router, TypeScript (strict mode), and native FFmpeg/FFprobe pipelines.

---

## 🎯 Key Capabilities

1. **Universal Media Transcoder**
   - Transcode local files between major audio and video containers: MP4 (H.264), WebM (VP9), MKV, MP3 (LAME), WAV (PCM 16-bit), AAC, OGG (Vorbis), and FLAC.
   - Adjust audio bitrates (128k, 192k, 256k, 320k Studio quality) and sampling rates (44.1 kHz, 48.0 kHz).
   - Video resolution scaling presets (Original, 1080p Full HD, 720p HD, 480p SD).
   - Audio/video track stripping and precise segment trimming with start/end timestamps.
   - Audio volume amplification and normalization.

2. **Direct Permitted Media Downloader**
   - Fetch and convert authorized direct media links (e.g., podcast episodes, open Creative Commons media feeds, authorized CDNs).
   - Built-in **SSRF Protection Shield**: Prevents connections to loopback (`127.0.0.1`, `localhost`), internal RFC1918 subnets (`10.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`), and cloud metadata IP (`169.254.169.254`).
   - Remote HTTP HEAD and chunked stream verification with size caps.

3. **Dedicated Audio Extractor**
   - 1-click video soundtrack demuxer to produce pure MP3, WAV, AAC, or FLAC audio from video files without video re-encoding overhead.

4. **Deep Metadata Inspector**
   - Real-time probe of audio and video streams via FFprobe.
   - Audits container format, duration, bitrate, video resolution, framerate, audio channels, sampling frequency, and ID3/container tags.
   - 1-click JSON export of stream parameters.

5. **Integrated HTML5 Media Preview Player**
   - In-browser playback with HTTP Range header seeking for both converted audio and video files before downloading.

---

## 🛡️ Fair Use, Compliance & Security Policy

MediaNest strictly complies with content ownership rules and platform terms:
- **Authorized Sources Only:** Supports local files and direct media endpoints explicitly permitted by their owners.
- **No DRM Circumvention:** Does not bypass access controls, encryption, or digital rights management.
- **No Unauthorized Platform Scraping:** Does not implement YouTube media extraction or unauthorized third-party site reverse-engineering.
- **Privacy by Design:** Staged media files are stored in ephemeral temporary storage and automatically purged. No remote tracking, no analytics, no external database logging.

---

## 🛠️ Technology Stack

- **Framework:** Next.js 16 (App Router with Server Components & Route Handlers)
- **Language:** TypeScript 5 (Strict Mode enabled)
- **Styling:** Tailwind CSS v4 with custom brand tokens
- **Media Engine:** FFmpeg 6.1 (`ffmpeg-static`) & FFprobe (`ffprobe-static`) via child process isolation
- **Validation:** Zod 4 for server-side schema verification and SSRF filtering
- **Icons:** Lucide React
- **Unit Testing:** Vitest with React Testing Library and JSDOM
- **End-to-End Testing:** Playwright with Chromium headless runner

---

## 📁 Architecture & Folder Structure

```text
├── e2e/                           # Playwright end-to-end test suite
│   └── home.spec.ts               # Homepage, tab switching, and API health checks
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── api/
│   │   │   ├── health/route.ts    # Health status & FFmpeg engine check
│   │   │   ├── media/
│   │   │   │   ├── convert/       # Media conversion route
│   │   │   │   ├── download/[id]/ # Streaming media download route
│   │   │   │   ├── inspect-url/   # Remote URL HEAD verification
│   │   │   │   ├── preview/[id]/  # Range-seeking in-browser preview
│   │   │   │   ├── sample/        # Instant demo test generator
│   │   │   │   └── upload/        # Multipart file upload & probing
│   │   ├── globals.css            # Color tokens, scrollbars, focus rings
│   │   ├── layout.tsx             # Root layout with metadata and fonts
│   │   └── page.tsx               # Primary page entrypoint
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx         # Brand header with navigation & health status
│   │   │   └── Footer.tsx         # Brand footer with compliance notes
│   │   ├── media/
│   │   │   ├── MediaPreview.tsx   # HTML5 audio/video preview & download trigger
│   │   │   └── MetadataInspectorCard.tsx # Stream breakdown grid
│   │   ├── tools/
│   │   │   ├── AudioExtractorTool.tsx   # Video to audio extraction workflow
│   │   │   ├── DirectDownloaderTool.tsx # Permitted URL fetcher
│   │   │   ├── MediaConverterTool.tsx   # Main drag-and-drop transcoder
│   │   │   └── MetadataInspectorTool.tsx# Standalone stream inspector
│   │   ├── ui/                    # Reusable Design System components
│   │   │   ├── Alert.tsx          # Info, success, warning, and error alerts
│   │   │   ├── Badge.tsx          # Format and status pills
│   │   │   ├── Button.tsx         # Variants, loading spinners, and icons
│   │   │   ├── Card.tsx           # Rounded modern card containers
│   │   │   ├── Input.tsx          # Accessible inputs with error validation
│   │   │   ├── ProgressBar.tsx    # Determinate and indeterminate states
│   │   │   ├── Select.tsx         # Dropdowns with icons
│   │   │   └── Spinner.tsx        # SVG loading indicators
│   │   └── MediaNestApp.tsx       # Top-level application shell
│   ├── config/
│   │   └── site.ts                # Brand name, supported formats & presets
│   ├── lib/
│   │   ├── media/
│   │   │   ├── ffmpeg-runner.ts   # Safe FFmpeg / FFprobe process runner
│   │   │   ├── remote-fetcher.ts  # Safe streaming fetcher with size limits
│   │   │   └── storage.ts         # Staging manager with auto-purge & UUID mapping
│   │   ├── utils/
│   │   │   └── format.ts          # Bytes, duration, bitrate, and filename cleaners
│   │   └── validation/
│   │       └── schemas.ts         # Zod schemas & SSRF network filters
│   └── tests/                     # Unit test suites (Vitest)
│       ├── components.test.tsx    # Button, Alert, Badge, and ProgressBar tests
│       ├── engine.test.ts         # FFmpeg / FFprobe runtime verification
│       ├── format.test.ts         # Byte and duration formatting tests
│       └── validation.test.ts     # Zod and SSRF security tests
├── .env.example                   # Environment configuration template
├── package.json                   # Dependencies and npm scripts
├── playwright.config.ts           # E2E test runner configuration
├── tsconfig.json                  # Strict TypeScript configuration
└── vitest.config.mts              # Vitest runner configuration
```

---

## 🚀 Quickstart & Setup Instructions

### Prerequisites
- Node.js 20 or higher (Node.js 24 recommended)
- npm 10 or higher

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Default configuration variables:
```env
NEXT_PUBLIC_APP_NAME="MediaNest"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
TEMP_MEDIA_DIR="./.temp_media"
MAX_UPLOAD_SIZE_MB=250
MAX_REMOTE_DOWNLOAD_SIZE_MB=200
MEDIA_CLEANUP_INTERVAL_MINUTES=30
ENABLE_DIRECT_DOWNLOAD=true
ENABLE_SSRF_PROTECTION=true
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm start
```

---

## 🧪 Testing & Verification

### Run Unit Tests (Vitest)
```bash
npm test
```
Executes all 37 unit tests across formatting utilities, Zod validation schemas, SSRF security filters, UI components, and the FFmpeg media engine.

### Run End-to-End Tests (Playwright)
```bash
npm run test:e2e
```
Runs the 5 Playwright end-to-end tests validating the homepage, navigation between all 4 tabs, compliance alerts, and the live `/api/health` API endpoint.

### Run ESLint & Type Checks
```bash
npm run lint
npx tsc --noEmit
```

---

## 🎨 Customizing the Brand

To change the brand name from **MediaNest** to another name:
1. Open `src/config/site.ts`.
2. Update the `name` and `shortName` properties:
   ```typescript
   export const SITE_CONFIG = {
     name: "YourBrand",
     shortName: "YourBrand",
     ...
   };
   ```
3. Update `.env.local`:
   ```env
   NEXT_PUBLIC_APP_NAME="YourBrand"
   ```
The navigation, footer, page titles, and meta descriptions will automatically reflect the updated branding.
