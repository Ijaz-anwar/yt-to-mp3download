# cPanel Production Deployment Guide (Setup Node.js App & Phusion Passenger)

This guide explains how to deploy **MediaNest** (Next.js 16 + Node.js YouTube MP3/MP4 Downloader) on a Linux cPanel hosting environment using **Setup Node.js App** and **Phusion Passenger**.

---

## 1. Server Prerequisites

1. **Node.js Version:** `>= 20.9.0` (Node.js **20.x LTS** or **22.x LTS** recommended in cPanel Node.js Selector).
2. **Python 3 & `yt-dlp`:**
   - Python 3.8+ must be available (`python3` in `PATH`, or configured via `PYTHON_PATH`).
   - Install `yt-dlp` via SSH / cPanel Terminal:
     ```bash
     python3 -m pip install --user -U yt-dlp
     ```
   - Alternatively, download the standalone `yt-dlp` Linux binary and configure `YT_DLP_PATH`:
     ```bash
     mkdir -p ~/bin
     curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ~/bin/yt-dlp
     chmod a+rx ~/bin/yt-dlp
     ```
3. **FFmpeg & FFprobe:**
   - `ffmpeg-static` and `ffprobe-static` are included in `package.json` and download Linux binaries automatically during `npm install`.
   - Ensure the partition allows executing binaries from `node_modules` (`chmod +x`), or install system FFmpeg and set `FFMPEG_PATH` and `FFPROBE_PATH`.
4. **Hosting Resource Requirements:**
   - **Persistent Single-Instance Process:** The app uses an in-memory job queue (`MemoryJobStore`) and spawns background child processes (`yt-dlp` and `ffmpeg`) while the frontend polls `/api/media/jobs/[id]`. Passenger must keep the Node.js instance alive while jobs are active.
   - **RAM:** Minimum **1 GB RAM** at runtime (**2 GB RAM** recommended if running `npm run build` directly on the server).
   - **Disk Space:** At least **2 GB free writable storage** for `.temp_media` (files are automatically purged after 15 minutes).
   - **Outbound Network:** Outbound HTTPS (`443`) access to `youtube.com`, `youtu.be`, and `*.googlevideo.com`.

---

## 2. Step-by-Step cPanel Setup

### Step 1: Clone the Repository
In **cPanel -> Git Version Control** (or via cPanel Terminal / SSH):
```bash
git clone https://github.com/Ijaz-anwar/yt-to-mp3download.git ~/yt-downloader
cd ~/yt-downloader
```

### Step 2: Create the Node.js Application in cPanel
Open **cPanel -> Software -> Setup Node.js App** and click **Create Application**:
- **Node.js version:** `20.x` or `22.x` (`>= 20.9.0`)
- **Application mode:** `Production`
- **Application root:** `yt-downloader`
- **Application URL:** Select your domain or subdomain
- **Application startup file:** `server.js`

Click **Create**.

### Step 3: Configure Environment Variables in cPanel
In the **Setup Node.js App** screen, add the following Environment Variables:

| Variable | Recommended Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Runs Next.js in production mode |
| `NEXT_PUBLIC_APP_NAME` | `MediaNest` | Public brand name |
| `NEXT_PUBLIC_SITE_URL` | `https://yourdomain.com` | Canonical domain for SEO & sitemap |
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.com` | Base application URL |
| `TEMP_MEDIA_DIR` | `./.temp_media` | Writable temporary download directory |
| `MEDIA_JOB_TTL_MS` | `900000` | 15-minute retention TTL for jobs & files |
| `MEDIA_CLEANUP_INTERVAL_MINUTES` | `15` | Automatic cleanup interval |
| `MAX_CONCURRENT_JOBS` | `2` | Maximum simultaneous conversions |
| `PYTHON_PATH` | *(Optional, e.g. `/usr/bin/python3`)* | Defaults to `python3` on Linux |
| `YT_DLP_PATH` | *(Optional, e.g. `/home/<user>/bin/yt-dlp`)* | Direct path to standalone `yt-dlp` binary |
| `FFMPEG_PATH` | *(Optional, e.g. `/usr/bin/ffmpeg`)* | Overrides `ffmpeg-static` if needed |
| `FFPROBE_PATH` | *(Optional, e.g. `/usr/bin/ffprobe`)* | Overrides `ffprobe-static` if needed |

### Step 4: Install Dependencies & Build
Copy the virtual environment activation command shown at the top of **Setup Node.js App** and run it in **cPanel Terminal / SSH**:
```bash
source /home/<your_cpanel_user>/nodevenv/yt-downloader/20/bin/activate && cd /home/<your_cpanel_user>/yt-downloader

# Install all dependencies (including devDependencies needed for TypeScript & Tailwind v4 build)
npm install --include=dev

# Ensure bundled FFmpeg & FFprobe binaries are executable on Linux
chmod +x node_modules/ffmpeg-static/ffmpeg || true
chmod +x node_modules/ffprobe-static/bin/linux/x64/ffprobe || true

# Build the production Next.js bundle
npm run build
```

> **Tip for Low-RAM Shared Hosting:** If `npm run build` fails on cPanel due to CloudLinux memory/process limits (`Out of memory` or `EAGAIN`), run `npm run build` on your local machine and upload the generated `.next` folder to `/home/<your_cpanel_user>/yt-downloader/.next`.

### Step 5: Start / Restart the Application
1. Return to **cPanel -> Setup Node.js App** and click **Restart** (or run `mkdir -p tmp && touch tmp/restart.txt` in the application root).
2. Verify system readiness by opening:
   `https://yourdomain.com/api/health`
   Confirm `"status": "healthy"`, `"ffmpegAvailable": true`, and `"writeable": true`.
