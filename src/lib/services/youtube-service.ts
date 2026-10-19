import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { MediaError, logger } from "./error-handler";

export interface YouTubeMetadata {
  id: string;
  title: string;
  thumbnail: string;
  duration: number; // in seconds
  uploader: string;
  webpageUrl: string;
}

export interface YouTubeDownloadResult {
  outputPath: string;
  size: number;
}

// In-memory cache for YouTube metadata to avoid duplicate yt-dlp calls when creating jobs
const globalForYtCache = globalThis as unknown as {
  ytMetadataCache?: Map<string, { data: YouTubeMetadata; expiresAt: number }>;
};
const ytMetadataCache =
  globalForYtCache.ytMetadataCache ??
  new Map<string, { data: YouTubeMetadata; expiresAt: number }>();
globalForYtCache.ytMetadataCache = ytMetadataCache;

/**
 * Extracts a canonical cache key (video ID or normalized URL) from a YouTube URL.
 */
function getCacheKey(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.trim());
    const host = parsed.hostname.toLowerCase();
    if (host.includes("youtu.be")) {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      if (id) return `yt:${id}`;
    }
    const v = parsed.searchParams.get("v");
    if (v) return `yt:${v}`;
    if (parsed.pathname.startsWith("/shorts/") || parsed.pathname.startsWith("/embed/")) {
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts[1]) return `yt:${parts[1]}`;
    }
  } catch {
    // fallback to trimmed url
  }
  return rawUrl.trim();
}

/**
 * Checks whether a given URL is a valid YouTube video link.
 */
export function isYouTubeUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  try {
    const parsed = new URL(rawUrl.trim());
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    const isYtHost =
      host === "youtube.com" ||
      host.endsWith(".youtube.com") ||
      host === "youtu.be" ||
      host.endsWith(".youtu.be");

    if (!isYtHost) return false;

    if (host.includes("youtu.be")) {
      return parsed.pathname.length > 1;
    }
    if (parsed.searchParams.has("v")) {
      return Boolean(parsed.searchParams.get("v"));
    }
    if (parsed.pathname.startsWith("/shorts/") || parsed.pathname.startsWith("/embed/")) {
      return parsed.pathname.split("/").length >= 3;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves the path to the bundled or system FFmpeg binary.
 */
export function getFfmpegBinaryPath(): string {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  const bundledWindows = path.resolve(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg.exe");
  if (fs.existsSync(bundledWindows)) {
    return bundledWindows;
  }
  const bundledUnix = path.resolve(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg");
  if (fs.existsSync(bundledUnix)) {
    return bundledUnix;
  }
  return "ffmpeg";
}

/**
 * Fetches YouTube video metadata quickly without downloading the media payload.
 * Uses an in-memory cache so subsequent job creation is instantaneous (0ms).
 */
export async function getYouTubeMetadata(
  url: string,
  timeoutMs: number = 40000
): Promise<YouTubeMetadata> {
  if (!isYouTubeUrl(url)) {
    throw new MediaError("Provided URL is not a recognized YouTube link.", 400, "INVALID_YOUTUBE_URL");
  }

  const cacheKey = getCacheKey(url);
  const cached = ytMetadataCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  return new Promise((resolve, reject) => {
    const args = [
      "-u",
      "-m",
      "yt_dlp",
      "--dump-json",
      "--skip-download",
      "--no-warnings",
      "--no-playlist",
      "--no-check-certificates",
      url.trim(),
    ];

    let settled = false;
    let stdoutBuffer = "";
    let stderrBuffer = "";

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill();
        reject(new MediaError("YouTube metadata extraction timed out. Please try again.", 504, "YOUTUBE_TIMEOUT"));
      }
    }, timeoutMs);

    const child = spawn("python", args, {
      windowsHide: true,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBuffer += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrBuffer += chunk.toString("utf8");
    });

    child.on("error", (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new MediaError(`Failed to launch YouTube extractor: ${err.message}`, 500, "YOUTUBE_SPAWN_ERROR"));
      }
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (code !== 0) {
        logger.error("youtube_metadata_failed", new Error(stderrBuffer), { url, code });
        return reject(
          new MediaError(
            "Could not fetch YouTube video details. Ensure the video is public and accessible.",
            400,
            "YOUTUBE_METADATA_ERROR"
          )
        );
      }

      try {
        const firstLine = stdoutBuffer.trim().split("\n")[0];
        const data = JSON.parse(firstLine);
        const result: YouTubeMetadata = {
          id: data.id || "youtube_video",
          title: data.title || "YouTube Video",
          thumbnail: data.thumbnail || "",
          duration: typeof data.duration === "number" ? data.duration : 0,
          uploader: data.uploader || data.channel || "YouTube",
          webpageUrl: data.webpage_url || url.trim(),
        };

        // Cache metadata for 30 minutes
        ytMetadataCache.set(cacheKey, {
          data: result,
          expiresAt: Date.now() + 30 * 60 * 1000,
        });

        resolve(result);
      } catch {
        reject(new MediaError("Failed to parse YouTube metadata output.", 500, "YOUTUBE_PARSE_ERROR"));
      }
    });
  });
}

/**
 * Downloads and converts YouTube video or audio to the requested target format
 * using multi-connection fragment downloading and fast FFmpeg arguments.
 */
export function downloadYouTubeMedia(
  url: string,
  targetFormat: "mp3" | "mp4",
  targetOutputPath: string,
  onProgress?: (percent: number) => void
): { promise: Promise<YouTubeDownloadResult>; cancel: () => void } {
  const ffmpegPath = getFfmpegBinaryPath();
  const dir = path.dirname(targetOutputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tempBase = path.join(dir, `yt_temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const tempPattern = `${tempBase}.%(ext)s`;

  const commonFastArgs = [
    "-u",
    "-m",
    "yt_dlp",
    "--newline",
    "--progress",
    "--no-warnings",
    "--no-playlist",
    "--no-check-certificates",
    "--concurrent-fragments",
    "16",
    "--buffer-size",
    "64K",
    "--http-chunk-size",
    "10M",
  ];

  let args: string[];

  if (targetFormat === "mp3") {
    args = [
      ...commonFastArgs,
      "-f",
      "ba[ext=m4a]/ba/b",
      "-x",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "192K",
      "--postprocessor-args",
      "ExtractAudio:-threads 0 -compression_level 9",
      "--ffmpeg-location",
      ffmpegPath,
      "-o",
      tempPattern,
      url.trim(),
    ];
  } else {
    // Prefer pre-merged progressive MP4 (up to 720p) for instant 0-merge download,
    // or fallback to <=720p H.264 MP4 + M4A stream copy so even 30-min videos finish quickly
    args = [
      ...commonFastArgs,
      "-f",
      "b[ext=mp4][height<=720]/bv*[ext=mp4][height<=720]+ba[ext=m4a]/b[ext=mp4]/bv*[height<=720]+ba/b",
      "--merge-output-format",
      "mp4",
      "--ffmpeg-location",
      ffmpegPath,
      "-o",
      tempPattern,
      url.trim(),
    ];
  }

  let child: ReturnType<typeof spawn> | null = null;
  let isCancelled = false;

  const cancel = () => {
    isCancelled = true;
    if (child) {
      try {
        child.kill();
      } catch {
        // ignore
      }
    }
  };

  const parseProgressChunk = (text: string) => {
    if (!onProgress) return;
    const matches = Array.from(text.matchAll(/\[download\]\s+(\d+(?:\.\d+)?)%/g));
    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      const pct = parseFloat(lastMatch[1]);
      if (!isNaN(pct)) {
        const scaled = Math.min(88, Math.max(5, Math.round(pct * 0.88)));
        onProgress(scaled);
      }
    }
    if (text.includes("[ExtractAudio]") || text.includes("[Merger]")) {
      onProgress(92);
    }
  };

  const promise = new Promise<YouTubeDownloadResult>((resolve, reject) => {
    child = spawn("python", args, {
      windowsHide: true,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });

    let stderrBuffer = "";

    child.stdout?.on("data", (chunk: Buffer) => {
      parseProgressChunk(chunk.toString("utf8"));
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stderrBuffer += text;
      parseProgressChunk(text);
    });

    child.on("error", (err) => {
      if (isCancelled) {
        return reject(new MediaError("YouTube download was cancelled.", 499, "JOB_CANCELLED"));
      }
      reject(new MediaError(`Failed to run YouTube downloader: ${err.message}`, 500, "DOWNLOAD_ERROR"));
    });

    child.on("close", (code) => {
      if (isCancelled) {
        return reject(new MediaError("YouTube download was cancelled.", 499, "JOB_CANCELLED"));
      }

      if (code !== 0) {
        logger.error("youtube_download_failed", new Error(stderrBuffer), { url, targetFormat, code });
        return reject(
          new MediaError(
            `YouTube download failed. Details: ${stderrBuffer.slice(-200) || "Process exited with error"}`,
            500,
            "YOUTUBE_DOWNLOAD_FAILED"
          )
        );
      }

      if (onProgress) {
        onProgress(98);
      }

      try {
        const files = fs.readdirSync(dir);
        const tempPrefix = path.basename(tempBase);
        const generatedFile = files.find(
          (f) => f.startsWith(tempPrefix) && !f.endsWith(".part") && !f.endsWith(".ytdl")
        );

        if (!generatedFile) {
          return reject(
            new MediaError("YouTube conversion finished but output file was not found.", 500, "OUTPUT_NOT_FOUND")
          );
        }

        const generatedFilePath = path.join(dir, generatedFile);

        if (fs.existsSync(targetOutputPath)) {
          fs.unlinkSync(targetOutputPath);
        }
        fs.renameSync(generatedFilePath, targetOutputPath);

        const stat = fs.statSync(targetOutputPath);
        if (stat.size === 0) {
          return reject(new MediaError("Output file is empty.", 500, "EMPTY_OUTPUT"));
        }

        if (onProgress) {
          onProgress(100);
        }

        resolve({
          outputPath: targetOutputPath,
          size: stat.size,
        });
      } catch (err) {
        reject(
          new MediaError(
            `Failed to finalize converted file: ${err instanceof Error ? err.message : "Filesystem error"}`,
            500,
            "FINALIZE_ERROR"
          )
        );
      }
    });
  });

  return { promise, cancel };
}
