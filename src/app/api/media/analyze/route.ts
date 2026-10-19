import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateRemoteMediaUrl, safeFetchAndStageRemoteMedia } from "@/lib/services/url-validator";
import { isYouTubeUrl, getYouTubeMetadata } from "@/lib/services/youtube-service";
import { detectMediaSignature } from "@/lib/services/upload-validator";
import { getFileRecord, saveUploadedFile } from "@/lib/services/temp-storage";
import { saveMediaBuffer } from "@/lib/media/storage";
import { probeMedia } from "@/lib/services/media-prober";
import { getMediaCapabilities } from "@/lib/services/format-capabilities";
import { handleApiError, MediaError, parseJsonBodyWithLimit } from "@/lib/services/error-handler";
import { enforceRateLimit } from "@/lib/services/rate-limiter";

const AnalyzeRequestSchema = z
  .object({
    url: z.string().trim().optional(),
    fileId: z.string().trim().optional(),
  })
  .refine((data) => Boolean(data.url || data.fileId), {
    message: "Either 'url' or 'fileId' must be provided for media analysis.",
  });

export async function POST(req: NextRequest) {
  try {
    const rlHeaders = await enforceRateLimit(req, "analyze");
    const rawBody = await parseJsonBodyWithLimit<unknown>(req, 64 * 1024);
    const { url, fileId } = AnalyzeRequestSchema.parse(rawBody);

    // Case 1: Analyzing an already uploaded file by fileId
    if (fileId) {
      const record = await getFileRecord(fileId);
      if (!record) {
        throw new MediaError(
          "The specified file was not found in temporary staging or has expired.",
          404,
          "FILE_NOT_FOUND"
        );
      }

      const metadata = await probeMedia(record.filePath, record.id, record.originalName);
      const capabilities = getMediaCapabilities(metadata);

      return NextResponse.json(
        {
          success: true,
          sourceType: "upload",
          fileId: record.id,
          metadata,
          capabilities,
        },
        { headers: rlHeaders }
      );
    }

    // Case 2: Analyzing a remote media URL
    if (url) {
      // 1. Validate URL against scheme, allowlist, restricted platform list, and DNS SSRF checks
      await validateRemoteMediaUrl(url);

      // Handle YouTube URLs specially (fast metadata probe without full video buffering)
      if (isYouTubeUrl(url)) {
        const yt = await getYouTubeMetadata(url);
        const metadata = {
          id: `yt_${yt.id}`,
          filename: `${yt.title.replace(/[/\\?%*:|"<>]/g, "_")}.mp4`,
          format: "youtube",
          duration: yt.duration,
          size: 0,
          bitrate: 0,
          mimeType: "video/mp4",
          hasAudio: true,
          hasVideo: true,
          audioStreams: [
            {
              codec: "aac",
              bitrate: 192000,
              channels: 2,
              sampleRate: 48000,
            },
          ],
          videoStreams: [
            {
              codec: "h264",
              width: 1920,
              height: 1080,
              fps: 30,
              bitrate: 2500000,
            },
          ],
        };

        const capabilities = {
          hasAudio: true,
          hasVideo: true,
          supportedFormats: ["mp3", "mp4"],
          allowedResolutions: ["original", "1080p", "720p", "480p"],
          allowedAudioBitrates: ["128k", "192k", "256k", "320k"],
        };

        return NextResponse.json(
          {
            success: true,
            sourceType: "youtube",
            youtubeUrl: url,
            youtubeInfo: {
              title: yt.title,
              thumbnail: yt.thumbnail,
              duration: yt.duration,
              uploader: yt.uploader,
            },
            metadata,
            capabilities,
          },
          { headers: rlHeaders }
        );
      }

      // 2. Safely fetch and stage the remote stream (with redirect safety & size limits)
      const { buffer, filename, mimeType } = await safeFetchAndStageRemoteMedia(url);

      // 3. Inspect binary magic bytes
      const signature = detectMediaSignature(buffer);
      if (!signature) {
        throw new MediaError(
          "The remote resource does not contain a supported audio or video binary stream.",
          422,
          "INVALID_REMOTE_MEDIA"
        );
      }

      // 4. Stage into controlled temporary storage
      const stored = await saveUploadedFile(buffer, filename, signature.mimeType || mimeType);
      // Synchronize with legacy storage registry for cross-compatibility
      await saveMediaBuffer(buffer, filename, signature.mimeType || mimeType);

      // 5. Probe media for duration, codecs, dimensions
      const metadata = await probeMedia(stored.filePath, stored.id, stored.originalName);
      const capabilities = getMediaCapabilities(metadata);

      return NextResponse.json(
        {
          success: true,
          sourceType: "url",
          fileId: stored.id,
          directUrl: url,
          metadata,
          capabilities,
        },
        { headers: rlHeaders }
      );
    }

    throw new MediaError("Invalid request.", 400, "BAD_REQUEST");
  } catch (error) {
    return handleApiError(error);
  }
}
