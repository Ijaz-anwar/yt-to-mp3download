import { NextRequest, NextResponse } from "next/server";
import { validateUploadedMedia } from "@/lib/services/upload-validator";
import { saveUploadedFile } from "@/lib/services/temp-storage";
import { saveMediaBuffer } from "@/lib/media/storage";
import { probeMedia } from "@/lib/services/media-prober";
import { getMediaCapabilities } from "@/lib/services/format-capabilities";
import { handleApiError, MediaError } from "@/lib/services/error-handler";
import { enforceRateLimit } from "@/lib/services/rate-limiter";

export async function POST(req: NextRequest) {
  try {
    const rlHeaders = await enforceRateLimit(req, "upload");

    const contentLength = req.headers.get("content-length");
    const maxUploadBytes =
      parseInt(process.env.MAX_UPLOAD_SIZE_BYTES || "", 10) || 250 * 1024 * 1024;
    if (contentLength && parseInt(contentLength, 10) > maxUploadBytes) {
      throw new MediaError(
        `Uploaded request payload exceeds the maximum permitted limit of ${Math.round(
          maxUploadBytes / (1024 * 1024)
        )} MB.`,
        413,
        "PAYLOAD_TOO_LARGE"
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      throw new MediaError("No media file was provided in the upload request.", 400, "NO_FILE_PROVIDED");
    }

    if (file.size === 0) {
      throw new MediaError("Uploaded file is empty (0 bytes).", 400, "EMPTY_FILE");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Strict validation of extension, MIME, file size, and binary magic bytes
    const validated = validateUploadedMedia(buffer, file.name, file.type);

    // 2. Stage to isolated server storage using UUID
    const record = await saveUploadedFile(
      buffer,
      validated.safeOriginalName,
      validated.signature.mimeType
    );

    // Also register in legacy storage map for backward compatibility
    await saveMediaBuffer(
      buffer,
      validated.safeOriginalName,
      validated.signature.mimeType
    );

    // 3. Probe real stream metadata using FFprobe
    const metadata = await probeMedia(record.filePath, record.id, record.originalName);

    // 4. Compute technically compatible output formats and resolutions
    const capabilities = getMediaCapabilities(metadata);

    return NextResponse.json(
      {
        success: true,
        fileId: record.id,
        record: {
          id: record.id,
          filename: record.originalName,
          size: record.size,
          mimeType: record.mimeType,
        },
        metadata,
        capabilities,
      },
      { status: 201, headers: rlHeaders }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
