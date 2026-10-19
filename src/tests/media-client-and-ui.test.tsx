import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  mediaApiClient,
  ApiClientError,
  normalizeActionableError,
} from "@/lib/api/media-client";
import { MediaResultCard } from "@/components/media/MediaResultCard";
import { MediaMetadata } from "@/lib/validation/schemas";
import { MediaCapabilities } from "@/lib/services/format-capabilities";

describe("mediaApiClient unit tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("analyzeUrl input validation", () => {
    it("rejects empty URL with EMPTY_URL error", async () => {
      await expect(mediaApiClient.analyzeUrl("   ")).rejects.toThrow(
        /Please provide a valid media URL/i
      );
    });

    it("rejects invalid scheme like ftp:// or file://", async () => {
      await expect(mediaApiClient.analyzeUrl("ftp://example.com/audio.mp3")).rejects.toThrow(
        /Only HTTP and HTTPS media URLs are supported/i
      );
    });

    it("rejects non-URL strings", async () => {
      await expect(mediaApiClient.analyzeUrl("not-a-valid-url")).rejects.toThrow(
        /Malformed media URL/i
      );
    });
  });

  describe("uploadFile validation", () => {
    it("rejects 0 byte empty files before network transmission", async () => {
      const emptyFile = new File([], "empty.mp3", { type: "audio/mpeg" });
      await expect(mediaApiClient.uploadFile(emptyFile)).rejects.toThrow(
        /The selected file is empty/i
      );
    });

    it("rejects files exceeding 250 MB before network transmission", async () => {
      // Synthetic representation of 251MB file
      const largeFile = {
        name: "huge.mp4",
        size: 251 * 1024 * 1024,
        type: "video/mp4",
      } as unknown as File;

      await expect(mediaApiClient.uploadFile(largeFile)).rejects.toThrow(
        /exceeds the maximum allowed upload limit of 250 MB/i
      );
    });
  });

  describe("normalizeActionableError", () => {
    it("preserves ApiClientError instances untouched", () => {
      const original = new ApiClientError("Custom message", "CUSTOM_CODE", 400);
      const normalized = normalizeActionableError(original);
      expect(normalized).toBe(original);
      expect(normalized.code).toBe("CUSTOM_CODE");
    });

    it("handles DOMException AbortError cleanly", () => {
      const abortErr = new DOMException("The user aborted a request.", "AbortError");
      const normalized = normalizeActionableError(abortErr);
      expect(normalized.code).toBe("ABORTED");
      expect(normalized.message).toContain("cancelled by user");
    });

    it("normalizes network failure messages", () => {
      const netErr = new Error("Failed to fetch");
      const normalized = normalizeActionableError(netErr);
      expect(normalized.code).toBe("NETWORK_ERROR");
      expect(normalized.message).toContain("Unable to connect to the MediaNest processing server");
    });
  });

  describe("getDownloadUrl", () => {
    it("returns correctly encoded download endpoint", () => {
      const url = mediaApiClient.getDownloadUrl("job_abc_123");
      expect(url).toBe("/api/media/jobs/job_abc_123/download");
    });
  });
});

describe("MediaResultCard UI State Machine", () => {
  const sampleVideoMeta: MediaMetadata = {
    id: "sample_video_id",
    filename: "presentation.mp4",
    format: "mp4",
    mimeType: "video/mp4",
    size: 15_000_000,
    duration: 125.5,
    hasVideo: true,
    hasAudio: true,
    videoCodec: "h264",
    audioCodec: "aac",
    videoWidth: 1280,
    videoHeight: 720,
    videoFps: 30,
    audioSampleRate: 48000,
    bitrate: 960000,
  };

  const sampleAudioMeta: MediaMetadata = {
    id: "sample_audio_id",
    filename: "voice_note.mp3",
    format: "mp3",
    mimeType: "audio/mpeg",
    size: 2_500_000,
    duration: 62.0,
    hasVideo: false,
    hasAudio: true,
    audioCodec: "mp3",
    audioSampleRate: 44100,
    bitrate: 128000,
  };

  const sampleCapabilities: MediaCapabilities = {
    hasVideo: true,
    hasAudio: true,
    availableFormats: [
      { id: "mp4", label: "MP4 Video", extension: ".mp4", category: "video", description: "H.264" },
      { id: "webm", label: "WebM Video", extension: ".webm", category: "video", description: "VP9" },
      { id: "mp3", label: "MP3 Audio", extension: ".mp3", category: "audio", description: "MP3" },
      { id: "m4a", label: "M4A Audio", extension: ".m4a", category: "audio", description: "AAC" },
    ],
    availableVideoFormats: [
      { id: "mp4", label: "MP4 Video", extension: ".mp4", category: "video", description: "H.264" },
      { id: "webm", label: "WebM Video", extension: ".webm", category: "video", description: "VP9" },
    ],
    availableAudioFormats: [
      { id: "mp3", label: "MP3 Audio", extension: ".mp3", category: "audio", description: "MP3" },
      { id: "m4a", label: "M4A Audio", extension: ".m4a", category: "audio", description: "AAC" },
    ],
    availableResolutions: ["original", "720p", "480p"], // Note: 1080p is excluded because height is 720
    availableBitrates: ["128k", "192k", "256k", "320k"],
    recommendedFormat: "mp4",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders verified metadata and source specs accurately", () => {
    render(
      <MediaResultCard
        sourceMetadata={sampleVideoMeta}
        sourceType="upload"
        fileId="sample_video_id"
        capabilities={sampleCapabilities}
      />
    );

    expect(screen.getAllByText("presentation.mp4").length).toBeGreaterThan(0);
    expect(screen.getByText("Analysis Verified")).toBeDefined();
    expect(screen.getAllByText(/1280×720/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/AAC/i).length).toBeGreaterThan(0);
  });

  it("disables video formats when source is audio-only", () => {
    render(
      <MediaResultCard
        sourceMetadata={sampleAudioMeta}
        sourceType="upload"
        fileId="sample_audio_id"
        capabilities={{
          ...sampleCapabilities,
          hasVideo: false,
          availableVideoFormats: [],
        }}
      />
    );

    expect(screen.getByText(/Audio-only input: Video options disabled/i)).toBeDefined();
    const videoBtn = screen.getByRole("button", { name: /video formats/i }) as HTMLButtonElement;
    expect(videoBtn.disabled).toBe(true);
  });

  it("filters video resolution dropdown strictly to allowed capabilities", () => {
    render(
      <MediaResultCard
        sourceMetadata={sampleVideoMeta}
        sourceType="upload"
        fileId="sample_video_id"
        capabilities={sampleCapabilities} // Only has original, 720p, 480p
      />
    );

    // 1080p should NOT be an option because source is 720p
    const select = screen.getByLabelText(/video resolution/i) as HTMLSelectElement;
    const optionValues = Array.from(select.options).map((o) => o.value);

    expect(optionValues).toContain("original");
    expect(optionValues).toContain("720p");
    expect(optionValues).toContain("480p");
    expect(optionValues).not.toContain("1080p");
  });

  it("submits job, polls real progress, and renders download button on completion", async () => {
    // Mock mediaApiClient.createJob
    vi.spyOn(mediaApiClient, "createJob").mockResolvedValueOnce({
      success: true,
      job: {
        id: "job_test_1",
        status: "processing",
        progress: 15,
        createdAt: Date.now(),
        targetFormat: "mp4",
        sourceFilename: "presentation.mp4",
        strategy: "transcode",
      },
    });

    // Mock mediaApiClient.getJob polling responses
    vi.spyOn(mediaApiClient, "getJob")
      .mockResolvedValueOnce({
        success: true,
        job: {
          id: "job_test_1",
          status: "processing",
          progress: 65,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          expiresAt: Date.now() + 3600000,
          sourceFileId: "sample_video_id",
          sourceFilename: "presentation.mp4",
          targetFormat: "mp4",
          strategy: "transcode",
          options: { targetFormat: "mp4" },
        },
      })
      .mockResolvedValueOnce({
        success: true,
        job: {
          id: "job_test_1",
          status: "completed",
          progress: 100,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          expiresAt: Date.now() + 3600000,
          sourceFileId: "sample_video_id",
          sourceFilename: "presentation.mp4",
          targetFormat: "mp4",
          outputFileId: "output_file_id",
          outputFilename: "presentation_converted.mp4",
          outputSize: 12_500_000,
          downloadUrl: "/api/media/jobs/job_test_1/download",
          timeMs: 2450,
          strategy: "transcode",
          options: { targetFormat: "mp4" },
        },
      });

    render(
      <MediaResultCard
        sourceMetadata={sampleVideoMeta}
        sourceType="upload"
        fileId="sample_video_id"
        capabilities={sampleCapabilities}
      />
    );

    const convertBtn = screen.getByRole("button", { name: /convert to mp4/i });
    fireEvent.click(convertBtn);

    // Initial progress from server
    await waitFor(() => {
      expect(screen.getByText(/Transcoding \(15%\)/i)).toBeDefined();
    });

    // Completion state
    await waitFor(
      () => {
        expect(screen.getByText(/Ready for Download/i)).toBeDefined();
        expect(
          screen.getByRole("button", { name: /download presentation_converted\.mp4/i })
        ).toBeDefined();
      },
      { timeout: 3500 }
    );
  });

  it("handles job cancellation smoothly", async () => {
    vi.spyOn(mediaApiClient, "createJob").mockResolvedValueOnce({
      success: true,
      job: {
        id: "job_cancel_test",
        status: "processing",
        progress: 20,
        createdAt: Date.now(),
        targetFormat: "mp4",
        sourceFilename: "presentation.mp4",
      },
    });

    const cancelSpy = vi.spyOn(mediaApiClient, "cancelJob").mockResolvedValueOnce({
      success: true,
      message: "Job cancelled",
    });

    render(
      <MediaResultCard
        sourceMetadata={sampleVideoMeta}
        sourceType="upload"
        fileId="sample_video_id"
        capabilities={sampleCapabilities}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /convert to mp4/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /cancel transcoding/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: /cancel transcoding/i }));

    await waitFor(() => {
      expect(cancelSpy).toHaveBeenCalledWith("job_cancel_test");
    });
  });

  it("displays actionable error message when job fails", async () => {
    vi.spyOn(mediaApiClient, "createJob").mockRejectedValueOnce(
      new ApiClientError("The input file contains an unsupported audio codec profile.", "CODEC_UNSUPPORTED", 422)
    );

    render(
      <MediaResultCard
        sourceMetadata={sampleVideoMeta}
        sourceType="upload"
        fileId="sample_video_id"
        capabilities={sampleCapabilities}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /convert to mp4/i }));

    await waitFor(() => {
      expect(screen.getByText(/The input file contains an unsupported audio codec profile/i)).toBeDefined();
      expect(screen.getByRole("button", { name: /retry conversion/i })).toBeDefined();
    });
  });
});
