import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import { getFfmpegPath } from "../media/ffmpeg-runner";
import { MediaError, sanitizeErrorMessage, logger } from "./error-handler";

export interface TranscodeOptions {
  targetFormat: string;
  audioBitrate?: "128k" | "192k" | "256k" | "320k";
  audioSampleRate?: 44100 | 48000;
  videoResolution?: "original" | "1080p" | "720p" | "480p";
  trimStart?: number;
  trimEnd?: number;
  stripAudio?: boolean;
  stripVideo?: boolean;
  volume?: number;
  sourceDuration?: number;
  strategy?: "remux" | "transcode";
  maxOutputSizeBytes?: number;
}

export interface TranscodeExecution {
  promise: Promise<{ success: boolean; timeMs: number }>;
  cancel: () => void;
}

/**
 * Builds safe FFmpeg argument array without any shell string interpolation
 */
export function buildFfmpegArgs(
  inputPath: string,
  outputPath: string,
  options: TranscodeOptions
): string[] {
  const args: string[] = [];

  // Trimming inputs
  if (options.trimStart !== undefined && options.trimStart > 0) {
    args.push("-ss", options.trimStart.toString());
  }
  if (options.trimEnd !== undefined && options.trimEnd > 0) {
    args.push("-to", options.trimEnd.toString());
  }

  // Input file
  args.push("-i", inputPath);

  const targetFormat = options.targetFormat.toLowerCase().trim();
  const isAudioTarget = ["mp3", "wav", "aac", "ogg", "flac", "m4a"].includes(targetFormat);
  const isRemux = options.strategy === "remux";

  if (isRemux) {
    // Lossless stream copy (remuxing) - preserves exact original bitstreams
    if (isAudioTarget) {
      args.push("-vn", "-c:a", "copy");
    } else {
      if (options.stripVideo) {
        args.push("-vn");
      } else {
        args.push("-c:v", "copy");
      }

      if (options.stripAudio) {
        args.push("-an");
      } else {
        args.push("-c:a", "copy");
      }

      if (targetFormat === "mp4") {
        args.push("-movflags", "+faststart");
      }
    }
  } else if (isAudioTarget) {
    // Strip video for pure audio conversions
    args.push("-vn");

    switch (targetFormat) {
      case "mp3":
        args.push("-c:a", "libmp3lame", "-b:a", options.audioBitrate || "192k");
        break;
      case "wav":
        args.push("-c:a", "pcm_s16le");
        break;
      case "aac":
        args.push("-c:a", "aac", "-b:a", options.audioBitrate || "192k");
        break;
      case "ogg":
        args.push("-c:a", "libvorbis", "-q:a", "4");
        break;
      case "flac":
        args.push("-c:a", "flac");
        break;
      case "m4a":
        args.push("-c:a", "aac", "-b:a", options.audioBitrate || "192k");
        break;
    }

    if (options.audioSampleRate) {
      args.push("-ar", options.audioSampleRate.toString());
    }
  } else {
    // Video container target (mp4, webm, mkv)
    if (options.stripVideo) {
      args.push("-vn");
    } else {
      switch (targetFormat) {
        case "mp4":
          args.push(
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "23",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart"
          );
          break;
        case "webm":
          args.push("-c:v", "libvpx-vp9", "-crf", "32", "-b:v", "0");
          break;
        case "mkv":
          args.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "23");
          break;
      }

      // Resolution downscaling with aspect preservation
      if (options.videoResolution && options.videoResolution !== "original") {
        const height =
          options.videoResolution === "1080p"
            ? 1080
            : options.videoResolution === "720p"
            ? 720
            : 480;
        args.push("-vf", `scale=-2:${height}`);
      }
    }

    // Audio stream in video container
    if (options.stripAudio) {
      args.push("-an");
    } else {
      if (targetFormat === "webm") {
        args.push("-c:a", "libopus");
      } else {
        args.push("-c:a", "aac");
      }
      if (options.audioBitrate) {
        args.push("-b:a", options.audioBitrate);
      }
    }
  }

  // Audio volume filter if requested (only valid during re-encoding)
  if (options.volume !== undefined && options.volume !== 1 && !options.stripAudio && !isRemux) {
    args.push("-filter:a", `volume=${options.volume}`);
  }

  // Instruct FFmpeg to stream machine-readable progress on stdout
  args.push("-progress", "pipe:1");

  // Overwrite output file
  args.push("-y", outputPath);

  return args;
}

/**
 * Runs native FFmpeg with real progress updates, execution timeout, and cancel support
 */
export function executeTranscode(
  inputPath: string,
  outputPath: string,
  options: TranscodeOptions,
  onProgress?: (percent: number) => void,
  timeoutMs?: number
): TranscodeExecution {
  let child: ChildProcess | null = null;
  let isCancelled = false;
  let timeoutTimer: NodeJS.Timeout | null = null;
  let sizeCheckTimer: NodeJS.Timeout | null = null;

  const envTimeout = parseInt(process.env.MAX_PROCESSING_TIMEOUT_MS || "", 10);
  const effectiveTimeoutMs =
    timeoutMs ?? (Number.isFinite(envTimeout) && envTimeout > 0 ? envTimeout : 5 * 60 * 1000);

  const maxSizeBytes =
    options.maxOutputSizeBytes ||
    parseInt(process.env.MAX_OUTPUT_SIZE_BYTES || "", 10) ||
    500 * 1024 * 1024; // 500 MB default

  const cleanupTimers = () => {
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }
    if (sizeCheckTimer) {
      clearInterval(sizeCheckTimer);
      sizeCheckTimer = null;
    }
  };

  const cancel = () => {
    isCancelled = true;
    cleanupTimers();
    if (child && !child.killed) {
      try {
        child.kill("SIGKILL");
      } catch {
        // Ignore kill error
      }
    }
    if (fs.existsSync(outputPath)) {
      try {
        fs.unlinkSync(outputPath);
      } catch {
        // Ignore cleanup error
      }
    }
  };

  const promise = new Promise<{ success: boolean; timeMs: number }>((resolve, reject) => {
    if (!fs.existsSync(inputPath)) {
      return reject(new MediaError("Source media file does not exist.", 404, "FILE_NOT_FOUND"));
    }

    const ffmpegBin = getFfmpegPath();

    // Verify configured binary path exists if custom path was specified
    const customFfmpegPath = process.env.FFMPEG_PATH?.trim();
    if (customFfmpegPath && !fs.existsSync(customFfmpegPath)) {
      return reject(
        new MediaError(
          `Configured FFMPEG_PATH "${customFfmpegPath}" does not exist on disk. ` +
            `Please specify a valid binary path or install FFmpeg.`,
          503,
          "FFMPEG_NOT_CONFIGURED"
        )
      );
    }

    const startTime = Date.now();
    const args = buildFfmpegArgs(inputPath, outputPath, options);

    logger.info("ffmpeg_transcode_start", {
      targetFormat: options.targetFormat,
      strategy: options.strategy || "transcode",
      timeoutMs: effectiveTimeoutMs,
    });

    try {
      child = spawn(ffmpegBin, args, {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (spawnErr) {
      return reject(
        new MediaError(
          `Failed to launch media transcoder: ${(spawnErr as Error).message}`,
          500,
          "FFMPEG_SPAWN_ERROR"
        )
      );
    }

    timeoutTimer = setTimeout(() => {
      cancel();
      reject(
        new MediaError(
          `Media processing timed out after exceeding ${Math.round(
            effectiveTimeoutMs / 1000
          )} seconds limit.`,
          408,
          "TRANSCODE_TIMEOUT"
        )
      );
    }, effectiveTimeoutMs);

    // Monitor output size to prevent unbounded disk growth
    sizeCheckTimer = setInterval(() => {
      if (fs.existsSync(outputPath)) {
        try {
          const stats = fs.statSync(outputPath);
          if (stats.size > maxSizeBytes) {
            cancel();
            reject(
              new MediaError(
                `Output media file exceeded the maximum allowed size limit of ${Math.round(
                  maxSizeBytes / (1024 * 1024)
                )} MB.`,
                413,
                "FILE_TOO_LARGE"
              )
            );
          }
        } catch {
          // File lock or transient stat error
        }
      }
    }, 500);

    let stderrOutput = "";
    const totalDurationSec =
      options.trimEnd && options.trimStart
        ? options.trimEnd - options.trimStart
        : options.sourceDuration || 0;

    // Parse progress stream
    child.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      const match = text.match(/out_time_us=(\d+)/);
      if (match && totalDurationSec > 0 && onProgress) {
        const outTimeUs = parseInt(match[1], 10);
        const currentSec = outTimeUs / 1000000;
        const percent = Math.min(99, Math.round((currentSec / totalDurationSec) * 100));
        onProgress(percent);
      }
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      stderrOutput += chunk.toString();
      if (stderrOutput.length > 50000) {
        stderrOutput = stderrOutput.slice(-20000); // Prevent unbounded buffer growth
      }
    });

    child.on("error", (err) => {
      cleanupTimers();
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return reject(
          new MediaError(
            `FFmpeg binary not found on the host system. Please install FFmpeg (Windows: winget install Gyan.FFmpeg; Linux: sudo apt install ffmpeg) or set FFMPEG_PATH.`,
            503,
            "FFMPEG_NOT_CONFIGURED"
          )
        );
      }
      reject(
        new MediaError(
          `Transcoder process error: ${sanitizeErrorMessage(err.message)}`,
          500,
          "FFMPEG_EXEC_ERROR"
        )
      );
    });

    child.on("close", (code) => {
      cleanupTimers();

      if (isCancelled) {
        return reject(new MediaError("Job was cancelled.", 499, "JOB_CANCELLED"));
      }

      if (code !== 0) {
        if (/no space left on device|enospc|disk full/i.test(stderrOutput)) {
          return reject(
            new MediaError(
              "Disk storage space exhausted during media conversion.",
              507,
              "INSUFFICIENT_STORAGE"
            )
          );
        }

        return reject(
          new MediaError(
            `Transcoding process exited with error code ${code}: ${sanitizeErrorMessage(
              stderrOutput.slice(-300)
            )}`,
            500,
            "TRANSCODE_FAILED"
          )
        );
      }

      // Verify destination file exists and is nonempty
      if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
        return reject(
          new MediaError("Conversion finished but produced an empty file.", 500, "EMPTY_OUTPUT")
        );
      }

      if (onProgress) {
        onProgress(100);
      }

      const durationMs = Date.now() - startTime;
      logger.info("ffmpeg_transcode_success", {
        timeMs: durationMs,
        targetFormat: options.targetFormat,
        strategy: options.strategy || "transcode",
      });

      resolve({ success: true, timeMs: durationMs });
    });
  });

  return { promise, cancel };
}
