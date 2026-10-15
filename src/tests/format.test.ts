import { describe, it, expect } from "vitest";
import {
  formatBytes,
  formatDuration,
  formatBitrate,
  sanitizeFilename,
  getMimeTypeForExt,
} from "../lib/utils/format";

describe("formatBytes", () => {
  it("formats zero bytes correctly", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("handles negative and NaN values gracefully", () => {
    expect(formatBytes(-100)).toBe("0 B");
    expect(formatBytes(NaN)).toBe("0 B");
  });

  it("formats kilobytes and megabytes accurately", () => {
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1048576)).toBe("1 MB");
    expect(formatBytes(52428800)).toBe("50 MB");
  });

  it("respects decimal precision argument", () => {
    expect(formatBytes(1234567, 2)).toBe("1.18 MB");
  });
});

describe("formatDuration", () => {
  it("formats 0 seconds as 00:00", () => {
    expect(formatDuration(0)).toBe("00:00");
  });

  it("formats under a minute correctly", () => {
    expect(formatDuration(45)).toBe("00:45");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(125)).toBe("02:05");
  });

  it("formats hours, minutes, and seconds", () => {
    expect(formatDuration(3665)).toBe("1:01:05");
  });

  it("handles invalid or NaN values safely", () => {
    expect(formatDuration(NaN)).toBe("00:00");
    expect(formatDuration(-10)).toBe("00:00");
  });
});

describe("formatBitrate", () => {
  it("formats kbps correctly", () => {
    expect(formatBitrate(192000)).toBe("192 kbps");
    expect(formatBitrate(320000)).toBe("320 kbps");
  });

  it("formats Mbps correctly", () => {
    expect(formatBitrate(2500000)).toBe("2.5 Mbps");
  });

  it("handles string or missing input gracefully", () => {
    expect(formatBitrate("128000")).toBe("128 kbps");
    expect(formatBitrate(undefined)).toBe("N/A");
  });
});

describe("sanitizeFilename", () => {
  it("removes dangerous path characters and traversal symbols", () => {
    expect(sanitizeFilename("../../../etc/passwd.mp3")).toBe("._._._etc_passwd.mp3");
    expect(sanitizeFilename('track"test<1>:2|?.wav')).toBe("track_test_1__2__.wav");
  });

  it("returns fallback when input is empty or invalid", () => {
    expect(sanitizeFilename("")).toBe("media-file");
  });
});

describe("getMimeTypeForExt", () => {
  it("resolves standard audio and video MIME types", () => {
    expect(getMimeTypeForExt("mp3")).toBe("audio/mpeg");
    expect(getMimeTypeForExt(".wav")).toBe("audio/wav");
    expect(getMimeTypeForExt("mp4")).toBe("video/mp4");
    expect(getMimeTypeForExt("webm")).toBe("video/webm");
  });

  it("returns binary stream for unknown extension", () => {
    expect(getMimeTypeForExt("xyz123")).toBe("application/octet-stream");
  });
});
