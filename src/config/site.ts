const rawSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://yt-to-mp3.download";

// Ensure canonical production origin has no trailing slash
export const CANONICAL_ORIGIN = rawSiteUrl.replace(/\/+$/, "");

/**
 * Returns an absolute canonical URL for a given path
 */
export function getCanonicalUrl(path = "/"): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (cleanPath === "/") {
    return CANONICAL_ORIGIN;
  }
  return `${CANONICAL_ORIGIN}${cleanPath.replace(/\/+$/, "")}`;
}

export const SITE_CONFIG = {
  name: "MediaNest",
  shortName: "MediaNest",
  tagline: "YouTube to MP3 & MP4 Downloader",
  description:
    "Paste any YouTube video URL to convert and download high-quality MP3 audio or MP4 video instantly.",
  url: CANONICAL_ORIGIN,
  links: {
    github: "https://github.com",
    home: "/",
    howItWorks: "/how-it-works",
    faq: "/faq",
    privacy: "/privacy",
    terms: "/terms",
    contact: "/contact",
  },
  maxUploadSizeBytes: (Number(process.env.MAX_UPLOAD_SIZE_MB) || 250) * 1024 * 1024,
  maxRemoteSizeBytes: (Number(process.env.MAX_REMOTE_DOWNLOAD_SIZE_MB) || 200) * 1024 * 1024,
  supportedFormats: {
    audio: [
      { id: "mp3", name: "MP3 Audio", ext: ".mp3", mime: "audio/mpeg", description: "320 kbps High-Quality Audio" },
    ],
    video: [
      { id: "mp4", name: "MP4 Video", ext: ".mp4", mime: "video/mp4", description: "Full HD 1080p / 720p Video" },
    ],
  },
  bitratePresets: [
    { value: "320k", label: "320 kbps (High Quality)" },
  ],
  sampleRatePresets: [
    { value: 44100, label: "44.1 kHz" },
    { value: 48000, label: "48.0 kHz" },
  ],
  resolutionPresets: [
    { value: "original", label: "Original HD Resolution" },
    { value: "1080p", label: "1080p Full HD" },
    { value: "720p", label: "720p HD" },
  ],
};
