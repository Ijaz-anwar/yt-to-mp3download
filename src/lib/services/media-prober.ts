import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { MediaError, sanitizeErrorMessage } from "./error-handler";
import { MediaMetadata } from "../validation/schemas";
import { getMimeTypeForExt } from "../utils/format";
import { getFfmpegPath, getFfprobePath } from "../media/ffmpeg-runner";
import { getThumbnailPath } from "../media/storage";

export interface ProbeRawStream {
  codec_type?: "video" | "audio" | "subtitle";
  codec_name?: string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
  sample_rate?: string;
  channels?: number;
  bit_rate?: string;
  duration?: string;
}

export interface ProbeRawFormat {
  filename?: string;
  nb_streams?: number;
  format_name?: string;
  format_long_name?: string;
  duration?: string;
  size?: string;
  bit_rate?: string;
}

export interface ProbeRawOutput {
  streams?: ProbeRawStream[];
  format?: ProbeRawFormat;
}

/**
 * Generates a video snapshot thumbnail safely
 */
export async function generateThumbnail(
  videoPath: string,
  thumbnailPath: string,
  seekSeconds = 1
): Promise<boolean> {
  if (!fs.existsSync(videoPath)) return false;

  const args = [
    "-ss",
    seekSeconds.toString(),
    "-i",
    videoPath,
    "-vframes",
    "1",
    "-vf",
    "scale=480:-2",
    "-q:v",
    "3",
    "-y",
    thumbnailPath,
  ];

  return new Promise((resolve) => {
    execFile(getFfmpegPath(), args, { timeout: 10000 }, (err) => {
      if (err || !fs.existsSync(thumbnailPath)) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

/**
 * Probes a local media file using native ffprobe and extracts standardized safe metadata.
 * Never fabricates metadata.
 */
export async function probeMedia(
  filePath: string,
  id: string,
  originalFilename: string
): Promise<MediaMetadata> {
  if (!fs.existsSync(filePath)) {
    throw new MediaError("Target media file was not found on disk.", 404, "FILE_NOT_FOUND");
  }

  let stats: fs.Stats;
  try {
    stats = await fs.promises.stat(filePath);
  } catch {
    throw new MediaError("Failed to access media file properties.", 500, "FILE_ACCESS_ERROR");
  }

  const args = [
    "-v",
    "quiet",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath,
  ];

  return new Promise((resolve, reject) => {
    const ffprobeBin = getFfprobePath();
    const customFfprobePath = process.env.FFPROBE_PATH?.trim();
    if (customFfprobePath && !fs.existsSync(customFfprobePath)) {
      return reject(
        new MediaError(
          `Configured FFPROBE_PATH "${customFfprobePath}" does not exist on disk. Please verify your binary configuration.`,
          503,
          "FFMPEG_NOT_CONFIGURED"
        )
      );
    }

    execFile(
      /* turbopackIgnore: true */ ffprobeBin,
      args,
      { timeout: 15000, maxBuffer: 5 * 1024 * 1024 },
      async (err, stdout, stderr) => {
        if (err) {
          if ((err as NodeJS.ErrnoException).code === "ENOENT") {
            return reject(
              new MediaError(
                "FFprobe binary is not installed or cannot be executed. Please install FFmpeg/FFprobe (Windows: winget install Gyan.FFmpeg; Linux: sudo apt install ffmpeg) or configure FFPROBE_PATH.",
                503,
                "FFMPEG_NOT_CONFIGURED"
              )
            );
          }

          const rawErr = stderr ? stderr.toString() : err.message;
          return reject(
            new MediaError(
              `Media probing failed: ${sanitizeErrorMessage(rawErr)}`,
              422,
              "PROBE_FAILED"
            )
          );
        }

        try {
          const parsed: ProbeRawOutput = JSON.parse(stdout.toString());
          const streams = parsed.streams || [];
          const format = parsed.format || {};

          const videoStream = streams.find((s) => s.codec_type === "video");
          const audioStream = streams.find((s) => s.codec_type === "audio");

          if (!videoStream && !audioStream) {
            return reject(
              new MediaError(
                "File contains no recognized audio or video streams.",
                422,
                "NO_MEDIA_STREAMS"
              )
            );
          }

          // Compute FPS
          let fps: number | undefined;
          if (videoStream?.r_frame_rate) {
            const parts = videoStream.r_frame_rate.split("/");
            if (parts.length === 2 && Number(parts[1]) > 0) {
              fps = Math.round((Number(parts[0]) / Number(parts[1])) * 100) / 100;
            } else {
              fps = Number(videoStream.r_frame_rate) || undefined;
            }
          }

          // Compute duration
          const duration = format.duration
            ? parseFloat(format.duration)
            : videoStream?.duration
            ? parseFloat(videoStream.duration)
            : audioStream?.duration
            ? parseFloat(audioStream.duration)
            : undefined;

          // Enforce maximum media duration limit (default 2 hours / 7200 seconds)
          const maxDurationSec = parseInt(process.env.MAX_MEDIA_DURATION_SECONDS || "", 10) || 7200;
          if (duration && duration > maxDurationSec) {
            return reject(
              new MediaError(
                `Media duration (${Math.round(duration / 60)} minutes) exceeds maximum allowed limit of ${Math.round(
                  maxDurationSec / 60
                )} minutes.`,
                400,
                "MEDIA_DURATION_EXCEEDED"
              )
            );
          }

          // Enforce maximum resolution limits to protect against memory allocation exhaustion
          if (videoStream?.width && videoStream.width > 4096) {
            return reject(
              new MediaError(
                `Video width (${videoStream.width}px) exceeds maximum allowed dimension of 4096px.`,
                400,
                "RESOLUTION_EXCEEDED"
              )
            );
          }
          if (videoStream?.height && videoStream.height > 4096) {
            return reject(
              new MediaError(
                `Video height (${videoStream.height}px) exceeds maximum allowed dimension of 4096px.`,
                400,
                "RESOLUTION_EXCEEDED"
              )
            );
          }

          // Compute bitrate
          const bitrate = format.bit_rate
            ? parseInt(format.bit_rate, 10)
            : audioStream?.bit_rate
            ? parseInt(audioStream.bit_rate, 10)
            : undefined;

          const ext = path.extname(originalFilename).replace(/^\./, "").toLowerCase();

          const metadata: MediaMetadata = {
            id,
            filename: originalFilename,
            format: format.format_name ? format.format_name.split(",")[0] : ext,
            formatLongName: format.format_long_name,
            duration: duration && !isNaN(duration) ? duration : undefined,
            size: stats.size,
            bitrate: bitrate && !isNaN(bitrate) ? bitrate : undefined,
            mimeType: getMimeTypeForExt(ext),
            hasAudio: Boolean(audioStream),
            hasVideo: Boolean(videoStream),
            audioCodec: audioStream?.codec_name,
            audioChannels: audioStream?.channels,
            audioSampleRate: audioStream?.sample_rate
              ? parseInt(audioStream.sample_rate, 10)
              : undefined,
            videoCodec: videoStream?.codec_name,
            videoWidth: videoStream?.width,
            videoHeight: videoStream?.height,
            videoFps: fps,
          };

          // If video exists, try to generate thumbnail
          if (videoStream) {
            const thumbPath = getThumbnailPath(id);
            const seekSec = Math.min(1, (duration || 2) / 2);
            const thumbSuccess = await generateThumbnail(filePath, thumbPath, seekSec);
            if (thumbSuccess) {
              metadata.thumbnailUrl = `/api/media/thumbnail/${id}`;
            }
          }

          resolve(metadata);
        } catch (parseErr) {
          reject(
            new MediaError(
              `Failed to parse media probe stream: ${(parseErr as Error).message}`,
              500,
              "PROBE_PARSE_ERROR"
            )
          );
        }
      }
    );
  });
}
