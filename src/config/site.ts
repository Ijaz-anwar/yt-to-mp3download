export const SITE_CONFIG = {
  name: "MediaNest",
  shortName: "MediaNest",
  tagline: "High-Performance Media Converter & Utility",
  description:
    "Convert, optimize, inspect, and extract audio or video from your authorized media files and permitted direct streams with high fidelity and zero tracking.",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  links: {
    github: "https://github.com",
    docs: "/docs",
    privacy: "/privacy",
    terms: "/terms",
  },
  maxUploadSizeBytes: (Number(process.env.MAX_UPLOAD_SIZE_MB) || 250) * 1024 * 1024,
  maxRemoteSizeBytes: (Number(process.env.MAX_REMOTE_DOWNLOAD_SIZE_MB) || 200) * 1024 * 1024,
  supportedFormats: {
    audio: [
      { id: "mp3", name: "MP3 Audio", ext: ".mp3", mime: "audio/mpeg", description: "Universal standard compressed audio" },
      { id: "wav", name: "WAV Audio", ext: ".wav", mime: "audio/wav", description: "Uncompressed lossless studio fidelity" },
      { id: "aac", name: "AAC Audio", ext: ".aac", mime: "audio/aac", description: "High-efficiency Apple/mobile audio" },
      { id: "ogg", name: "OGG Vorbis", ext: ".ogg", mime: "audio/ogg", description: "Open source web-optimized audio" },
      { id: "flac", name: "FLAC Audio", ext: ".flac", mime: "audio/flac", description: "Lossless compressed master audio" },
      { id: "m4a", name: "M4A Audio", ext: ".m4a", mime: "audio/mp4", description: "MPEG-4 Audio container" },
    ],
    video: [
      { id: "mp4", name: "MP4 Video", ext: ".mp4", mime: "video/mp4", description: "H.264 / AAC standard compatible container" },
      { id: "webm", name: "WebM Video", ext: ".webm", mime: "video/webm", description: "VP8/VP9 open modern web video" },
      { id: "mkv", name: "MKV Video", ext: ".mkv", mime: "video/x-matroska", description: "Matroska flexible multimedia container" },
    ],
  },
  bitratePresets: [
    { value: "128k", label: "128 kbps (Standard)" },
    { value: "192k", label: "192 kbps (High Quality)" },
    { value: "256k", label: "256 kbps (Very High)" },
    { value: "320k", label: "320 kbps (Maximum / Studio)" },
  ],
  sampleRatePresets: [
    { value: 44100, label: "44.1 kHz (CD Audio)" },
    { value: 48000, label: "48.0 kHz (Studio Video standard)" },
  ],
  resolutionPresets: [
    { value: "original", label: "Original Resolution" },
    { value: "1080p", label: "1080p Full HD (1920×1080)" },
    { value: "720p", label: "720p HD (1280×720)" },
    { value: "480p", label: "480p SD (854×480)" },
  ],
};
