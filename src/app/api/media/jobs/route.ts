import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAndStartJob } from "@/lib/services/job-manager";
import { getFileRecord } from "@/lib/services/temp-storage";
import { probeMedia } from "@/lib/services/media-prober";
import {
  validateConversionCapabilities,
  determineConversionStrategy,
} from "@/lib/services/format-capabilities";
import { handleApiError, MediaError, parseJsonBodyWithLimit } from "@/lib/services/error-handler";
import { enforceRateLimit } from "@/lib/services/rate-limiter";
import { SUPPORTED_TARGET_FORMATS } from "@/lib/validation/schemas";
import { isYouTubeUrl, getYouTubeMetadata } from "@/lib/services/youtube-service";

const CreateJobSchema = z
  .object({
    fileId: z.string().trim().optional(),
    youtubeUrl: z.string().trim().optional(),
    targetFormat: z.enum(SUPPORTED_TARGET_FORMATS, {
      message: "Unsupported target format specified.",
    }),
    audioBitrate: z.enum(["128k", "192k", "256k", "320k"]).optional(),
    audioSampleRate: z.union([z.literal(44100), z.literal(48000)]).optional(),
    videoResolution: z.enum(["original", "1080p", "720p", "480p"]).optional(),
    trimStart: z.number().min(0).optional(),
    trimEnd: z.number().min(0).optional(),
    stripAudio: z.boolean().optional(),
    stripVideo: z.boolean().optional(),
    volume: z.number().min(0).max(3).optional(),
  })
  .refine((data) => Boolean(data.fileId || data.youtubeUrl), {
    message: "Either 'fileId' or 'youtubeUrl' must be provided for media conversion.",
  })
  .refine(
    (data) => {
      if (data.trimStart !== undefined && data.trimEnd !== undefined) {
        return data.trimEnd > data.trimStart;
      }
      return true;
    },
    {
      message: "trimEnd must be strictly greater than trimStart.",
      path: ["trimEnd"],
    }
  );

export async function POST(req: NextRequest) {
  try {
    const rlHeaders = await enforceRateLimit(req, "job_create");
    const rawBody = await parseJsonBodyWithLimit<unknown>(req, 64 * 1024);
    const input = CreateJobSchema.parse(rawBody);

    // Case 1: Direct YouTube video conversion
    if (input.youtubeUrl) {
      if (!isYouTubeUrl(input.youtubeUrl)) {
        throw new MediaError("Invalid YouTube URL provided.", 400, "INVALID_YOUTUBE_URL");
      }
      const yt = await getYouTubeMetadata(input.youtubeUrl);
      const cleanTitle = yt.title.replace(/[/\\?%*:|"<>]/g, "_");
      const job = await createAndStartJob({
        youtubeUrl: input.youtubeUrl,
        sourceFilename: `${cleanTitle}.${input.targetFormat}`,
        targetFormat: input.targetFormat,
        strategy: "transcode",
        fidelityNotice:
          input.targetFormat === "mp3"
            ? "Direct high-bitrate audio extraction."
            : "Direct HD video stream download.",
        options: {
          targetFormat: input.targetFormat,
          strategy: "transcode",
          audioBitrate: input.audioBitrate,
          videoResolution: input.videoResolution,
        },
      });

      const ownerToken = job.ownerToken;
      const response = NextResponse.json(
        {
          success: true,
          job: {
            id: job.id,
            status: job.status,
            progress: job.progress,
            createdAt: job.createdAt,
            targetFormat: job.targetFormat,
            sourceFilename: job.sourceFilename,
            strategy: job.strategy,
            fidelityNotice: job.fidelityNotice,
          },
          ownerToken,
        },
        {
          status: 201,
          headers: rlHeaders,
        }
      );

      if (ownerToken) {
        response.cookies.set(`mn_token_${job.id}`, ownerToken, {
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          maxAge: 15 * 60,
        });
      }

      return response;
    }

    // Case 2: Staged file conversion
    if (!input.fileId) {
      throw new MediaError("fileId is required when not converting from a YouTube URL.", 400, "BAD_REQUEST");
    }

    // 1. Verify source file exists in staging
    const sourceRecord = await getFileRecord(input.fileId);
    if (!sourceRecord) {
      throw new MediaError(
        "Source media file does not exist or has expired. Please re-upload or re-analyze.",
        404,
        "SOURCE_NOT_FOUND"
      );
    }

    // 2. Probe source file to verify technical capabilities
    const metadata = await probeMedia(
      sourceRecord.filePath,
      sourceRecord.id,
      sourceRecord.originalName
    );

    // 3. Prevent incompatible requests (e.g. video container from audio-only source)
    validateConversionCapabilities(metadata, input.targetFormat, {
      videoResolution: input.videoResolution,
      audioBitrate: input.audioBitrate,
    });

    // 4. Determine conversion strategy (remux vs transcode) and quality notes
    const strategyResult = determineConversionStrategy(metadata, input.targetFormat, {
      videoResolution: input.videoResolution,
      audioBitrate: input.audioBitrate,
      trimStart: input.trimStart,
      trimEnd: input.trimEnd,
      volume: input.volume,
      stripAudio: input.stripAudio,
      stripVideo: input.stripVideo,
    });

    // 5. Create and start transcoding job
    const job = await createAndStartJob({
      sourceFileId: input.fileId,
      sourceFilename: sourceRecord.originalName,
      targetFormat: input.targetFormat,
      strategy: strategyResult.strategy,
      fidelityNotice: strategyResult.fidelityNotice,
      options: {
        targetFormat: input.targetFormat,
        strategy: strategyResult.strategy,
        audioBitrate: input.audioBitrate,
        audioSampleRate: input.audioSampleRate,
        videoResolution: input.videoResolution,
        trimStart: input.trimStart,
        trimEnd: input.trimEnd,
        stripAudio: input.stripAudio,
        stripVideo: input.stripVideo,
        volume: input.volume,
        sourceDuration: metadata.duration,
      },
    });

    const ownerToken = job.ownerToken;

    const response = NextResponse.json(
      {
        success: true,
        job: {
          id: job.id,
          status: job.status,
          progress: job.progress,
          createdAt: job.createdAt,
          targetFormat: job.targetFormat,
          sourceFilename: job.sourceFilename,
          strategy: job.strategy,
          fidelityNotice: job.fidelityNotice,
        },
        ownerToken,
      },
      {
        status: 201,
        headers: rlHeaders,
      }
    );

    if (ownerToken) {
      response.cookies.set(`mn_token_${job.id}`, ownerToken, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 15 * 60, // 15-minute TTL
      });
    }

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
