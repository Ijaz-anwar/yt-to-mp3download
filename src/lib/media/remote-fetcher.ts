import fs from "fs";
import path from "path";
import { isSafeRemoteUrl } from "../validation/schemas";
import { createTempOutputPath, registerConvertedMedia, StoredMediaRecord } from "./storage";
import { probeMediaFile } from "./ffmpeg-runner";
import { SITE_CONFIG } from "@/config/site";
import { sanitizeFilename } from "../utils/format";

export interface RemoteInspectResult {
  url: string;
  filename: string;
  contentType: string;
  contentLength?: number;
  acceptRanges: boolean;
  isMedia: boolean;
}

/**
 * Inspect a remote URL without downloading the entire body
 */
export async function inspectRemoteMediaUrl(url: string): Promise<RemoteInspectResult> {
  const safety = isSafeRemoteUrl(url);
  if (!safety.safe) {
    throw new Error(safety.reason || "URL is not permitted.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    // Attempt HEAD request first
    let response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: {
        "User-Agent": "MediaNest/1.0 (+https://medianest.local; Media Utility)",
      },
    });

    // If server rejects HEAD (e.g. 405 Method Not Allowed), retry with Range GET of 0-0
    if (response.status === 405 || response.status === 403 || !response.ok) {
      response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "User-Agent": "MediaNest/1.0 (+https://medianest.local; Media Utility)",
          Range: "bytes=0-1024",
        },
      });
    }

    clearTimeout(timeoutId);

    if (!response.ok && response.status !== 206) {
      throw new Error(`Remote host returned HTTP status ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const contentLengthHeader = response.headers.get("content-length");
    const acceptRanges = response.headers.get("accept-ranges") === "bytes";

    // Extract filename from Content-Disposition or URL path
    let filename = "remote-media";
    const disposition = response.headers.get("content-disposition");
    if (disposition) {
      const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)["']?/i);
      if (match && match[1]) {
        filename = decodeURIComponent(match[1].trim());
      }
    } else {
      try {
        const parsed = new URL(url);
        const base = path.basename(parsed.pathname);
        if (base && base.includes(".")) {
          filename = decodeURIComponent(base);
        }
      } catch {
        // use fallback
      }
    }

    filename = sanitizeFilename(filename, "media-resource");

    const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : undefined;

    // Check size limit
    if (contentLength && contentLength > SITE_CONFIG.maxRemoteSizeBytes) {
      throw new Error(
        `Remote media size (${Math.round(contentLength / (1024 * 1024))}MB) exceeds maximum permitted limit (${
          SITE_CONFIG.maxRemoteSizeBytes / (1024 * 1024)
        }MB).`
      );
    }

    const isMedia =
      contentType.startsWith("video/") ||
      contentType.startsWith("audio/") ||
      contentType.includes("ogg") ||
      /\.(mp4|m4a|mp3|wav|ogg|aac|webm|flac|mkv)$/i.test(filename);

    return {
      url,
      filename,
      contentType,
      contentLength,
      acceptRanges,
      isMedia,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if ((err as Error).name === "AbortError") {
      throw new Error("Request to remote URL timed out after 12 seconds.");
    }
    throw err;
  }
}

/**
 * Safely stream and download a remote media file to staging storage
 */
export async function downloadRemoteMedia(
  url: string,
  suggestedName?: string
): Promise<{ record: StoredMediaRecord; metadata: ReturnType<typeof probeMediaFile> extends Promise<infer T> ? T : never }> {
  const inspect = await inspectRemoteMediaUrl(url);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for download

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "MediaNest/1.0 (+https://medianest.local; Media Utility)",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download remote file: HTTP ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error("Remote server returned an empty body.");
    }

    const ext = path.extname(suggestedName || inspect.filename) || ".tmp";
    const { filePath } = createTempOutputPath(ext);

    // Stream to disk and enforce max size limit on the fly
    const fileStream = fs.createWriteStream(filePath);
    let totalBytes = 0;
    const maxBytes = SITE_CONFIG.maxRemoteSizeBytes;

    // Read stream chunks
    // @ts-expect-error Node.js ReadableStream web compatibility
    for await (const chunk of response.body) {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        fileStream.destroy();
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }
        throw new Error(
          `Download exceeded maximum allowed size of ${maxBytes / (1024 * 1024)}MB. Aborted.`
        );
      }
      fileStream.write(chunk);
    }

    await new Promise<void>((resolve, reject) => {
      fileStream.end((err?: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });

    clearTimeout(timeoutId);

    const originalName = suggestedName || inspect.filename;
    const cleanExt = ext.replace(/^\./, "");
    const record = await registerConvertedMedia(
      filePath,
      originalName,
      cleanExt,
      inspect.contentType
    );

    // Run ffprobe on real downloaded content
    const metadata = await probeMediaFile(filePath, record.id, originalName);

    return { record, metadata };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}
