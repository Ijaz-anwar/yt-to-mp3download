import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import { MediaMetadata } from "../validation/schemas";
import { getMimeTypeForExt } from "../utils/format";
import { getThumbnailPath } from "./storage";

// Robust binary path resolution for ESM and CJS bundlers
export function getFfmpegPath(): string {
  if (typeof ffmpegStatic === "string") return ffmpegStatic;
  const anyFfmpeg = ffmpegStatic as unknown as Record<string, unknown> | null;
  if (anyFfmpeg && typeof anyFfmpeg.default === "string") {
    return anyFfmpeg.default;
  }
  if (anyFfmpeg && typeof anyFfmpeg.path === "string") {
    return anyFfmpeg.path;
  }
  return "ffmpeg";
}

export function getFfprobePath(): string {
  if (typeof ffprobeStatic === "string") return ffprobeStatic;
  const anyFfprobe = ffprobeStatic as unknown as Record<string, unknown> | null;
  if (anyFfprobe && typeof anyFfprobe.path === "string") {
    return anyFfprobe.path;
  }
  if (
    anyFfprobe &&
    typeof anyFfprobe.default === "object" &&
    anyFfprobe.default !== null &&
    typeof (anyFfprobe.default as Record<string, unknown>).path === "string"
  ) {
    return (anyFfprobe.default as Record<string, unknown>).path as string;
  }
  return "ffprobe";
}

export interface ProbeStream {
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

export interface ProbeFormat {
  filename?: string;
  nb_streams?: number;
  format_name?: string;
  format_long_name?: string;
  duration?: string;
  size?: string;
  bit_rate?: string;
  tags?: Record<string, string>;
}

export interface ProbeResult {
  streams?: ProbeStream[];
  format?: ProbeFormat;
}

export interface ConversionOptions {
  targetFormat: string;
  audioBitrate?: "128k" | "192k" | "256k" | "320k";
  audioSampleRate?: 44100 | 48000;
  videoResolution?: "original" | "1080p" | "720p" | "480p";
  trimStart?: number;
  trimEnd?: number;
  stripAudio?: boolean;
  stripVideo?: boolean;
  volume?: number;
}

/**
 * Check if ffmpeg and ffprobe binaries are callable
 */
export async function verifyMediaEngine(): Promise<{
  ffmpeg: boolean;
  ffprobe: boolean;
  ffmpegVersion?: string;
  ffprobeVersion?: string;
}> {
  const check = (bin: string): Promise<{ ok: boolean; version?: string }> => {
    return new Promise((resolve) => {
      execFile(bin, ["-version"], (err, stdout) => {
        if (err || !stdout) {
          resolve({ ok: false });
        } else {
          const firstLine = stdout.toString().split("\n")[0].trim();
          resolve({ ok: true, version: firstLine });
        }
      });
    });
  };

  const [ffmpegRes, ffprobeRes] = await Promise.all([
    check(getFfmpegPath()),
    check(getFfprobePath()),
  ]);

  return {
    ffmpeg: ffmpegRes.ok,
    ffprobe: ffprobeRes.ok,
    ffmpegVersion: ffmpegRes.version,
    ffprobeVersion: ffprobeRes.version,
  };
}

/**
 * Extract a representative video frame as a JPEG thumbnail
 */
export async function generateVideoThumbnail(
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
    execFile(getFfmpegPath(), args, (err) => {
      if (err || !fs.existsSync(thumbnailPath)) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

/**
 * Extract genuine media metadata using ffprobe
 */
export async function probeMediaFile(
  filePath: string,
  id: string,
  originalFilename: string
): Promise<MediaMetadata> {
  if (!fs.existsSync(filePath)) {
    throw new Error("Specified media file does not exist on disk.");
  }

  const stats = await fs.promises.stat(filePath);

  return new Promise((resolve, reject) => {
    const args = [
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      filePath,
    ];

    execFile(getFfprobePath(), args, (err, stdout) => {
      if (err) {
        // Fallback: If ffprobe fails (e.g. unknown raw stream), provide basic file info
        const ext = path.extname(originalFilename).replace(/^\./, "");
        return resolve({
          id,
          filename: originalFilename,
          format: ext || "unknown",
          formatLongName: "Binary Media Stream",
          size: stats.size,
          mimeType: getMimeTypeForExt(ext),
          hasAudio: false,
          hasVideo: false,
        });
      }

      try {
        const parsed: ProbeResult = JSON.parse(stdout.toString());
        const streams = parsed.streams || [];
        const format = parsed.format || {};

        const videoStream = streams.find((s) => s.codec_type === "video");
        const audioStream = streams.find((s) => s.codec_type === "audio");

        // Parse framerate from fraction like "30/1" or "29.97"
        let fps: number | undefined;
        if (videoStream?.r_frame_rate) {
          const parts = videoStream.r_frame_rate.split("/");
          if (parts.length === 2 && Number(parts[1]) > 0) {
            fps = Math.round((Number(parts[0]) / Number(parts[1])) * 100) / 100;
          } else {
            fps = Number(videoStream.r_frame_rate) || undefined;
          }
        }

        const duration = format.duration
          ? parseFloat(format.duration)
          : videoStream?.duration
          ? parseFloat(videoStream.duration)
          : audioStream?.duration
          ? parseFloat(audioStream.duration)
          : undefined;

        const bitrate = format.bit_rate
          ? parseInt(format.bit_rate, 10)
          : audioStream?.bit_rate
          ? parseInt(audioStream.bit_rate, 10)
          : undefined;

        const ext = path.extname(originalFilename).replace(/^\./, "");

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

        if (videoStream) {
          const thumbPath = getThumbnailPath(id);
          const seekSec = Math.min(1, (duration || 2) / 2);
          generateVideoThumbnail(filePath, thumbPath, seekSec).then((success) => {
            if (success) {
              metadata.thumbnailUrl = `/api/media/thumbnail/${id}`;
            }
            resolve(metadata);
          }).catch(() => {
            resolve(metadata);
          });
        } else {
          resolve(metadata);
        }
      } catch (parseErr) {
        reject(
          new Error(
            `Failed to parse media probe response: ${(parseErr as Error).message}`
          )
        );
      }
    });
  });
}

/**
 * Execute real FFmpeg transcode / convert job
 */
export async function convertMediaFile(
  inputPath: string,
  outputPath: string,
  options: ConversionOptions
): Promise<{ success: boolean; timeMs: number }> {
  if (!fs.existsSync(inputPath)) {
    throw new Error("Input media file is missing.");
  }

  const startTime = Date.now();
  const args: string[] = ["-i", inputPath];

  // Trimming parameters
  if (options.trimStart !== undefined && options.trimStart > 0) {
    args.push("-ss", options.trimStart.toString());
  }
  if (options.trimEnd !== undefined && options.trimEnd > 0) {
    args.push("-to", options.trimEnd.toString());
  }

  const isAudioTarget = ["mp3", "wav", "aac", "ogg", "flac", "m4a"].includes(
    options.targetFormat.toLowerCase()
  );

  if (isAudioTarget) {
    // Strip video track for audio target formats
    args.push("-vn");

    switch (options.targetFormat.toLowerCase()) {
      case "mp3":
        args.push("-c:a", "libmp3lame");
        args.push("-b:a", options.audioBitrate || "192k");
        break;
      case "wav":
        args.push("-c:a", "pcm_s16le");
        break;
      case "aac":
        args.push("-c:a", "aac");
        args.push("-b:a", options.audioBitrate || "192k");
        break;
      case "ogg":
        args.push("-c:a", "libvorbis");
        args.push("-q:a", "4");
        break;
      case "flac":
        args.push("-c:a", "flac");
        break;
      case "m4a":
        args.push("-c:a", "aac");
        args.push("-b:a", options.audioBitrate || "192k");
        break;
    }

    if (options.audioSampleRate) {
      args.push("-ar", options.audioSampleRate.toString());
    }
  } else {
    // Video target format (mp4, webm, mkv)
    if (options.stripVideo) {
      args.push("-vn");
    } else {
      switch (options.targetFormat.toLowerCase()) {
        case "mp4":
          args.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "23");
          args.push("-pix_fmt", "yuv420p");
          args.push("-movflags", "+faststart");
          break;
        case "webm":
          args.push("-c:v", "libvpx-vp9", "-crf", "32", "-b:v", "0");
          break;
        case "mkv":
          args.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "23");
          break;
      }

      // Resolution scaling
      if (options.videoResolution && options.videoResolution !== "original") {
        const height =
          options.videoResolution === "1080p"
            ? 1080
            : options.videoResolution === "720p"
            ? 720
            : 480;
        // Keep aspect ratio with even dimensions (required by libx264)
        args.push("-vf", `scale=-2:${height}`);
      }
    }

    // Audio stream options for video
    if (options.stripAudio) {
      args.push("-an");
    } else {
      if (options.targetFormat.toLowerCase() === "webm") {
        args.push("-c:a", "libopus");
      } else {
        args.push("-c:a", "aac");
      }
      if (options.audioBitrate) {
        args.push("-b:a", options.audioBitrate);
      }
    }
  }

  // Volume filter if specified
  if (options.volume !== undefined && options.volume !== 1 && !options.stripAudio) {
    args.push("-filter:a", `volume=${options.volume}`);
  }

  // Overwrite destination without prompting
  args.push("-y", outputPath);

  return new Promise((resolve, reject) => {
    execFile(
      getFfmpegPath(),
      args,
      { maxBuffer: 10 * 1024 * 1024 },
      (err, _stdout, stderr) => {
        const durationMs = Date.now() - startTime;
        if (err) {
          // Sanitize error message to avoid revealing server filesystem paths
          const cleanErr = stderr
            ? stderr
                .toString()
                .replace(new RegExp(process.cwd().replace(/\\/g, "\\\\"), "gi"), "[workspace]")
                .slice(-600)
            : err.message;
          return reject(
            new Error(`Media transcoding failed: ${cleanErr.trim()}`)
          );
        }

        // Verify output file was actually written and non-empty
        if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
          return reject(
            new Error("Conversion completed but produced an empty media output.")
          );
        }

        resolve({ success: true, timeMs: durationMs });
      }
    );
  });
}
