/**
 * Media formatting and string manipulation utilities
 */

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  if (bytes < 0 || isNaN(bytes)) return "0 B";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeI = Math.min(i, sizes.length - 1);

  return `${parseFloat((bytes / Math.pow(k, safeI)).toFixed(dm))} ${sizes[safeI]}`;
}

export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return "00:00";

  const rounded = Math.floor(seconds);
  const hrs = Math.floor(rounded / 3600);
  const mins = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

export function formatBitrate(bitrate: number | string | undefined): string {
  if (!bitrate) return "N/A";
  const num = typeof bitrate === "string" ? parseInt(bitrate, 10) : bitrate;
  if (isNaN(num)) return "N/A";

  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)} Mbps`;
  }
  if (num >= 1000) {
    return `${Math.round(num / 1000)} kbps`;
  }
  return `${num} bps`;
}

export function sanitizeFilename(name: string, fallback = "media-file"): string {
  if (!name) return fallback;
  // Strip dangerous path traversal characters, null bytes, and windows-reserved characters
  const clean = name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\.{2,}/g, ".")
    .trim();

  return clean.length > 0 ? clean : fallback;
}

export const EXTENSION_MIME_MAP: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  aac: "audio/aac",
  ogg: "audio/ogg",
  flac: "audio/flac",
  m4a: "audio/mp4",
  mp4: "video/mp4",
  webm: "video/webm",
  mkv: "video/x-matroska",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
};

export function getMimeTypeForExt(ext: string): string {
  const normalized = ext.toLowerCase().replace(/^\./, "");
  return EXTENSION_MIME_MAP[normalized] || "application/octet-stream";
}
