import { z } from "zod";

// List of private/internal hostnames and IP prefixes disallowed for SSRF security
const BLOCKED_HOSTNAMES = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
  "instance-data",
];

const PRIVATE_IP_REGEXES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^169\.254\./, // AWS / cloud link-local metadata
  /^fc00:/i,
  /^fe80:/i,
];

export function isSafeRemoteUrl(urlString: string): { safe: boolean; reason?: string } {
  try {
    const parsed = new URL(urlString);

    // Protocol enforcement: HTTP and HTTPS only
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { safe: false, reason: "Only HTTP and HTTPS protocols are permitted." };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check blocked hostnames
    if (BLOCKED_HOSTNAMES.includes(hostname)) {
      return { safe: false, reason: "Local and loopback network addresses are blocked for security." };
    }

    // Check private/internal IP ranges
    for (const regex of PRIVATE_IP_REGEXES) {
      if (regex.test(hostname)) {
        return { safe: false, reason: "Private and internal IP ranges are blocked for security." };
      }
    }

    // Block non-standard or dangerous ports
    const port = parsed.port ? parseInt(parsed.port, 10) : parsed.protocol === "https:" ? 443 : 80;
    const allowedPorts = [80, 443, 8080, 8443];
    if (!allowedPorts.includes(port)) {
      return { safe: false, reason: `Port ${port} is not permitted.` };
    }

    return { safe: true };
  } catch {
    return { safe: false, reason: "Invalid URL format." };
  }
}

export const UrlInspectSchema = z.object({
  url: z
    .string()
    .trim()
    .url({ message: "Please provide a valid HTTP or HTTPS media URL." })
    .max(2048, { message: "URL exceeds maximum length of 2048 characters." })
    .refine((val) => isSafeRemoteUrl(val).safe, {
      message: "The requested URL targets a restricted local or private network address.",
    }),
});

export type UrlInspectInput = z.infer<typeof UrlInspectSchema>;

export const SUPPORTED_TARGET_FORMATS = [
  "mp3",
  "wav",
  "aac",
  "ogg",
  "flac",
  "m4a",
  "mp4",
  "webm",
  "mkv",
] as const;

export const ConvertRequestSchema = z
  .object({
    fileId: z.string().uuid().optional(),
    directUrl: z
      .string()
      .url()
      .optional()
      .refine((val) => !val || isSafeRemoteUrl(val).safe, {
        message: "The direct URL targets an unauthorized network address.",
      }),
    targetFormat: z.enum(SUPPORTED_TARGET_FORMATS, {
      message: "Unsupported target format requested.",
    }),
    audioBitrate: z.enum(["128k", "192k", "256k", "320k"]).optional(),
    audioSampleRate: z.union([z.literal(44100), z.literal(48000)]).optional(),
    videoResolution: z.enum(["original", "1080p", "720p", "480p"]).optional(),
    trimStart: z.number().min(0).optional(),
    trimEnd: z.number().min(0).optional(),
    stripAudio: z.boolean().optional(),
    stripVideo: z.boolean().optional(),
    volume: z.number().min(0).max(3).optional(), // 0 to 300%
  })
  .refine((data) => data.fileId || data.directUrl, {
    message: "Either a valid uploaded fileId or directUrl must be provided.",
    path: ["fileId"],
  })
  .refine(
    (data) => {
      if (data.trimStart !== undefined && data.trimEnd !== undefined) {
        return data.trimEnd > data.trimStart;
      }
      return true;
    },
    {
      message: "Trim end time must be strictly greater than trim start time.",
      path: ["trimEnd"],
    }
  );

export type ConvertRequestInput = z.infer<typeof ConvertRequestSchema>;

export const MediaMetadataResponseSchema = z.object({
  id: z.string(),
  filename: z.string(),
  format: z.string(),
  formatLongName: z.string().optional(),
  duration: z.number().optional(),
  size: z.number(),
  bitrate: z.number().optional(),
  mimeType: z.string(),
  hasAudio: z.boolean(),
  hasVideo: z.boolean(),
  audioCodec: z.string().optional(),
  audioChannels: z.number().optional(),
  audioSampleRate: z.number().optional(),
  videoCodec: z.string().optional(),
  videoWidth: z.number().optional(),
  videoHeight: z.number().optional(),
  videoFps: z.number().optional(),
  isDirectUrl: z.boolean().optional(),
  thumbnailUrl: z.string().optional(),
});

export type MediaMetadata = z.infer<typeof MediaMetadataResponseSchema>;
