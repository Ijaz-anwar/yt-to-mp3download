import { describe, it, expect, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  buildFfmpegArgs,
  executeTranscode,
} from "@/lib/services/ffmpeg-service";
import {
  determineConversionStrategy,
  validateConversionCapabilities,
} from "@/lib/services/format-capabilities";
import {
  jobStore,
  getJobById,
  cancelJobById,
  isFileReferencedByActiveJob,
} from "@/lib/services/job-manager";
import {
  saveUploadedFile,
  deleteStoredFile,
} from "@/lib/services/temp-storage";
import { probeMedia } from "@/lib/services/media-prober";

describe("FFmpeg Binary Configuration & Pre-flight Checks", () => {
  const originalFfmpegPath = process.env.FFMPEG_PATH;
  const originalFfprobePath = process.env.FFPROBE_PATH;

  afterEach(() => {
    process.env.FFMPEG_PATH = originalFfmpegPath;
    process.env.FFPROBE_PATH = originalFfprobePath;
  });

  it("throws clear 503 FFMPEG_NOT_CONFIGURED if FFMPEG_PATH points to non-existent executable", async () => {
    process.env.FFMPEG_PATH = "C:\\nonexistent\\path\\to\\ffmpeg.exe";

    const dummyInput = path.resolve(process.cwd(), "dummy-in.mp4");
    const dummyOutput = path.resolve(process.cwd(), "dummy-out.mp4");

    // Create a temporary dummy input file
    fs.writeFileSync(dummyInput, "dummy content");

    try {
      const { promise } = executeTranscode(dummyInput, dummyOutput, {
        targetFormat: "mp4",
      });

      await expect(promise).rejects.toThrowError(
        expect.objectContaining({
          code: "FFMPEG_NOT_CONFIGURED",
          statusCode: 503,
        })
      );
    } finally {
      if (fs.existsSync(dummyInput)) fs.unlinkSync(dummyInput);
      if (fs.existsSync(dummyOutput)) fs.unlinkSync(dummyOutput);
    }
  });

  it("throws clear 503 FFMPEG_NOT_CONFIGURED if FFPROBE_PATH points to non-existent executable", async () => {
    process.env.FFPROBE_PATH = "C:\\nonexistent\\path\\to\\ffprobe.exe";

    const dummyInput = path.resolve(process.cwd(), "dummy-in-probe.mp4");
    fs.writeFileSync(dummyInput, "dummy content");

    try {
      await expect(
        probeMedia(dummyInput, "probe-test-id", "dummy.mp4")
      ).rejects.toThrowError(
        expect.objectContaining({
          code: "FFMPEG_NOT_CONFIGURED",
          statusCode: 503,
        })
      );
    } finally {
      if (fs.existsSync(dummyInput)) fs.unlinkSync(dummyInput);
    }
  });
});

describe("FFmpeg Argument Builder & Strategy Handling", () => {
  it("builds lossless remuxing args for audio stream copy (e.g. M4A extraction)", () => {
    const args = buildFfmpegArgs("input.mp4", "output.m4a", {
      targetFormat: "m4a",
      strategy: "remux",
    });

    expect(args).toContain("-vn");
    expect(args).toContain("-c:a");
    expect(args).toContain("copy");
    expect(args).not.toContain("libmp3lame");
    expect(args).not.toContain("libx264");
  });

  it("builds lossless remuxing args for video container copy (e.g. MP4 faststart)", () => {
    const args = buildFfmpegArgs("input.mkv", "output.mp4", {
      targetFormat: "mp4",
      strategy: "remux",
    });

    expect(args).toContain("-c:v");
    expect(args).toContain("copy");
    expect(args).toContain("-c:a");
    expect(args).toContain("copy");
    expect(args).toContain("-movflags");
    expect(args).toContain("+faststart");
  });

  it("builds full transcode args for MP3 conversion with audio bitrate", () => {
    const args = buildFfmpegArgs("input.mp4", "output.mp3", {
      targetFormat: "mp3",
      strategy: "transcode",
      audioBitrate: "320k",
    });

    expect(args).toContain("-vn");
    expect(args).toContain("-c:a");
    expect(args).toContain("libmp3lame");
    expect(args).toContain("-b:a");
    expect(args).toContain("320k");
  });

  it("builds WebM transcoding args using VP9 and Opus", () => {
    const args = buildFfmpegArgs("input.mp4", "output.webm", {
      targetFormat: "webm",
      strategy: "transcode",
    });

    expect(args).toContain("-c:v");
    expect(args).toContain("libvpx-vp9");
    expect(args).toContain("-c:a");
    expect(args).toContain("libopus");
  });

  it("includes resolution downscaling filter for video presets", () => {
    const args = buildFfmpegArgs("input.mp4", "output.mp4", {
      targetFormat: "mp4",
      strategy: "transcode",
      videoResolution: "720p",
    });

    expect(args).toContain("-vf");
    expect(args).toContain("scale=-2:720");
  });
});

describe("Conversion Strategy Detection & Fidelity Transparency", () => {
  it("selects lossless remuxing when H.264 video with AAC audio converts to MP4 without modifications", () => {
    const metadata = {
      id: "meta-1",
      filename: "test.mkv",
      format: "matroska",
      size: 10000000,
      mimeType: "video/x-matroska",
      hasAudio: true,
      hasVideo: true,
      videoCodec: "h264",
      audioCodec: "aac",
    };

    const strategy = determineConversionStrategy(metadata, "mp4");
    expect(strategy.strategy).toBe("remux");
    expect(strategy.isLossless).toBe(true);
    expect(strategy.videoCodec).toBe("copy");
    expect(strategy.audioCodec).toBe("copy");
  });

  it("selects lossless audio demux when extracting AAC from MP4 to M4A", () => {
    const metadata = {
      id: "meta-2",
      filename: "test.mp4",
      format: "mp4",
      size: 5000000,
      mimeType: "video/mp4",
      hasAudio: true,
      hasVideo: true,
      videoCodec: "h264",
      audioCodec: "aac",
    };

    const strategy = determineConversionStrategy(metadata, "m4a");
    expect(strategy.strategy).toBe("remux");
    expect(strategy.isLossless).toBe(true);
    expect(strategy.audioCodec).toBe("copy");
  });

  it("warns about bitrate inflation when requested bitrate exceeds source bitrate", () => {
    const metadata = {
      id: "meta-3",
      filename: "compressed.mp3",
      format: "mp3",
      size: 1000000,
      mimeType: "audio/mpeg",
      hasAudio: true,
      hasVideo: false,
      bitrate: 128000, // 128 kbps source
    };

    const strategy = determineConversionStrategy(metadata, "mp3", {
      audioBitrate: "320k",
    });

    expect(strategy.fidelityNotice).toBeDefined();
    expect(strategy.fidelityNotice).toMatch(/cannot restore audio fidelity/);
  });

  it("rejects audio extraction when source has no audio stream", () => {
    const silentVideo = {
      id: "meta-silent",
      filename: "silent.mp4",
      format: "mp4",
      size: 2000000,
      mimeType: "video/mp4",
      hasAudio: false,
      hasVideo: true,
    };

    expect(() => validateConversionCapabilities(silentVideo, "mp3")).toThrowError(
      expect.objectContaining({
        code: "NO_AUDIO_STREAM",
        statusCode: 400,
      })
    );
  });

  it("rejects video conversion when source has no video stream", () => {
    const audioOnly = {
      id: "meta-audio",
      filename: "podcast.mp3",
      format: "mp3",
      size: 2000000,
      mimeType: "audio/mpeg",
      hasAudio: true,
      hasVideo: false,
    };

    expect(() => validateConversionCapabilities(audioOnly, "mp4")).toThrowError(
      expect.objectContaining({
        code: "INCOMPATIBLE_CONVERSION",
        statusCode: 400,
      })
    );
  });
});

describe("Active Job Reference Protection in Storage", () => {
  it("prevents deletion of source file while an active job is processing or queued", async () => {
    // 1. Create a dummy file in storage
    const file = await saveUploadedFile(
      Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]),
      "active-ref.mp4",
      "video/mp4"
    );

    // 2. Create a job referencing this file
    const job = await jobStore.create({
      sourceFileId: file.id,
      sourceFilename: file.originalName,
      targetFormat: "mp3",
      options: { targetFormat: "mp3" },
    });

    expect(await isFileReferencedByActiveJob(file.id)).toBe(true);

    // 3. Attempting to delete the file should throw 409 FILE_IN_USE
    await expect(deleteStoredFile(file.id)).rejects.toThrowError(
      expect.objectContaining({
        code: "FILE_IN_USE",
        statusCode: 409,
      })
    );

    // 4. Mark job completed / cancelled
    await jobStore.update(job.id, { status: "cancelled" });

    expect(await isFileReferencedByActiveJob(file.id)).toBe(false);

    // 5. Now file can be deleted safely
    const deleted = await deleteStoredFile(file.id);
    expect(deleted).toBe(true);
  });
});

describe("Job Cancellation & Concurrency Limits", () => {
  it("cancels a queued or active job and marks it cancelled", async () => {
    const file = await saveUploadedFile(
      Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]),
      "cancel-test.mp4",
      "video/mp4"
    );

    const job = await jobStore.create({
      sourceFileId: file.id,
      sourceFilename: file.originalName,
      targetFormat: "mp3",
      options: { targetFormat: "mp3" },
    });

    expect(job.status).toBe("queued");

    const cancelled = await cancelJobById(job.id);
    expect(cancelled).toBe(true);

    const updated = await getJobById(job.id);
    expect(updated?.status).toBe("cancelled");
    expect(updated?.error).toContain("cancelled");

    await deleteStoredFile(file.id);
  });

  it("enforces FIFO execution order for queued jobs", async () => {
    const job1 = await jobStore.create({
      sourceFileId: "src-1",
      sourceFilename: "first.mp4",
      targetFormat: "mp3",
      options: { targetFormat: "mp3" },
    });

    const job2 = await jobStore.create({
      sourceFileId: "src-2",
      sourceFilename: "second.mp4",
      targetFormat: "mp4",
      options: { targetFormat: "mp4" },
    });

    const jobs = await jobStore.list();
    const queued = jobs.filter((j) => j.status === "queued" && (j.id === job1.id || j.id === job2.id));
    expect(queued[0].id).toBe(job1.id);
    expect(queued[1].id).toBe(job2.id);

    await jobStore.delete(job1.id);
    await jobStore.delete(job2.id);
  });
});

