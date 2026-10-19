import path from "path";
import { v4 as uuidv4 } from "uuid";
import { MediaError } from "./error-handler";
import { sanitizeFilename } from "../utils/format";

export interface MediaSignature {
  format: string;
  category: "video" | "audio";
  mimeType: string;
  defaultExt: string;
}

export const ALLOWED_EXTENSIONS = new Set([
  ".mp4",
  ".m4v",
  ".webm",
  ".mkv",
  ".mov",
  ".mp3",
  ".wav",
  ".m4a",
  ".aac",
  ".ogg",
  ".oga",
  ".opus",
  ".flac",
]);

export const ALLOWED_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/x-matroska",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/flac",
  "audio/x-flac",
  "audio/ogg",
  "audio/aac",
  "audio/mp4",
  "audio/x-m4a",
  "application/ogg",
  "application/octet-stream", // Client fallback MIME
]);

/**
 * Inspects leading magic bytes to identify real binary media containers.
 * Prevents disguised executable or HTML payloads from being accepted.
 */
export function detectMediaSignature(buffer: Buffer): MediaSignature | null {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  // 1. MP4 / M4A / MOV (ISO Base Media File Format)
  // Bytes 4-7 must be 'ftyp' or 'moov'
  const boxType = buffer.toString("ascii", 4, 8);
  if (boxType === "ftyp" || boxType === "moov") {
    const brand = buffer.toString("ascii", 8, 12).trim().toLowerCase();
    if (brand.startsWith("m4a") || brand.startsWith("m4b")) {
      return { format: "m4a", category: "audio", mimeType: "audio/mp4", defaultExt: ".m4a" };
    }
    if (brand.startsWith("qt")) {
      return { format: "mov", category: "video", mimeType: "video/quicktime", defaultExt: ".mov" };
    }
    return { format: "mp4", category: "video", mimeType: "video/mp4", defaultExt: ".mp4" };
  }

  // 2. WebM / Matroska (EBML: 0x1A 0x45 0xDF 0xA3)
  if (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    // Search first 128 bytes for 'webm' or 'matroska'
    const headerSlice = buffer.slice(0, Math.min(buffer.length, 128)).toString("binary");
    if (headerSlice.includes("webm")) {
      return { format: "webm", category: "video", mimeType: "video/webm", defaultExt: ".webm" };
    }
    return { format: "mkv", category: "video", mimeType: "video/x-matroska", defaultExt: ".mkv" };
  }

  // 3. FLAC (fLaC: 0x66 0x4C 0x61 0x43)
  if (
    buffer[0] === 0x66 &&
    buffer[1] === 0x4c &&
    buffer[2] === 0x61 &&
    buffer[3] === 0x43
  ) {
    return { format: "flac", category: "audio", mimeType: "audio/flac", defaultExt: ".flac" };
  }

  // 4. OGG Container (OggS: 0x4F 0x67 0x67 0x53)
  if (
    buffer[0] === 0x4f &&
    buffer[1] === 0x67 &&
    buffer[2] === 0x67 &&
    buffer[3] === 0x53
  ) {
    return { format: "ogg", category: "audio", mimeType: "audio/ogg", defaultExt: ".ogg" };
  }

  // 5. WAV (RIFF....WAVE)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x41 &&
    buffer[10] === 0x56 &&
    buffer[11] === 0x45
  ) {
    return { format: "wav", category: "audio", mimeType: "audio/wav", defaultExt: ".wav" };
  }

  // 6. MP3 with ID3v2 header ('ID3': 0x49 0x44 0x33)
  if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
    return { format: "mp3", category: "audio", mimeType: "audio/mpeg", defaultExt: ".mp3" };
  }

  // 7. MP3 raw MPEG audio frame sync (11 sync bits: 0xFF followed by 0xE0 mask)
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
    const version = (buffer[1] >> 3) & 0x03;
    const layer = (buffer[1] >> 1) & 0x03;
    if (version !== 1 && layer !== 0) {
      return { format: "mp3", category: "audio", mimeType: "audio/mpeg", defaultExt: ".mp3" };
    }
  }

  // 8. AAC ADTS syncword (12 bits: 0xFFF)
  if (buffer[0] === 0xff && (buffer[1] & 0xf0) === 0xf0) {
    const layer = (buffer[1] >> 1) & 0x03;
    if (layer === 0) {
      return { format: "aac", category: "audio", mimeType: "audio/aac", defaultExt: ".aac" };
    }
  }

  return null;
}

export interface ValidatedUpload {
  safeOriginalName: string;
  serverFilename: string;
  fileId: string;
  signature: MediaSignature;
  fileSize: number;
}

/**
 * Validates uploaded file buffer, extension, and content type.
 * Generates an isolated random server-side filename.
 */
export function validateUploadedMedia(
  buffer: Buffer,
  clientFilename: string,
  clientMimeType?: string
): ValidatedUpload {
  const maxBytes = (parseInt(process.env.MAX_UPLOAD_SIZE_MB || "250", 10)) * 1024 * 1024;

  if (!buffer || buffer.length === 0) {
    throw new MediaError("Uploaded file is empty.", 400, "EMPTY_FILE");
  }

  if (buffer.length > maxBytes) {
    const maxMb = maxBytes / (1024 * 1024);
    throw new MediaError(
      `File size (${Math.round(buffer.length / (1024 * 1024))}MB) exceeds maximum allowed limit of ${maxMb}MB.`,
      400,
      "FILE_TOO_LARGE"
    );
  }

  // Validate filename and extension
  const safeOriginalName = sanitizeFilename(clientFilename || "uploaded_media.bin");
  const ext = path.extname(safeOriginalName).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new MediaError(
      `File extension "${ext}" is not supported. Supported extensions: ${Array.from(ALLOWED_EXTENSIONS).join(", ")}`,
      400,
      "UNSUPPORTED_EXTENSION"
    );
  }

  // Validate client MIME type if present
  if (clientMimeType && !ALLOWED_MIME_TYPES.has(clientMimeType.toLowerCase())) {
    throw new MediaError(
      `MIME type "${clientMimeType}" is not permitted for media uploads.`,
      400,
      "INVALID_MIME_TYPE"
    );
  }

  // Inspect binary magic bytes
  const signature = detectMediaSignature(buffer);
  if (!signature) {
    throw new MediaError(
      "The uploaded file does not match a valid audio or video binary format signature. File was rejected.",
      400,
      "INVALID_FILE_SIGNATURE"
    );
  }

  // Generate safe server-side storage filename
  const fileId = uuidv4();
  const serverFilename = `${fileId}${signature.defaultExt || ext}`;

  return {
    safeOriginalName,
    serverFilename,
    fileId,
    signature,
    fileSize: buffer.length,
  };
}
