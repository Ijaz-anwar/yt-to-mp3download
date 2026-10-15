import { describe, it, expect } from "vitest";
import {
  isSafeRemoteUrl,
  UrlInspectSchema,
  ConvertRequestSchema,
} from "../lib/validation/schemas";

describe("isSafeRemoteUrl", () => {
  it("allows valid public HTTPS URLs", () => {
    const res = isSafeRemoteUrl("https://example.com/audio/sample.mp3");
    expect(res.safe).toBe(true);
  });

  it("blocks localhost and loopback addresses", () => {
    expect(isSafeRemoteUrl("http://localhost:3000/media.mp4").safe).toBe(false);
    expect(isSafeRemoteUrl("http://127.0.0.1/stream").safe).toBe(false);
    expect(isSafeRemoteUrl("http://0.0.0.0/stream").safe).toBe(false);
  });

  it("blocks private network ranges (10.x, 192.168.x, 172.16.x)", () => {
    expect(isSafeRemoteUrl("http://192.168.1.100/video.mp4").safe).toBe(false);
    expect(isSafeRemoteUrl("http://10.0.0.5:8080/audio.mp3").safe).toBe(false);
    expect(isSafeRemoteUrl("http://172.16.0.1/media").safe).toBe(false);
  });

  it("blocks AWS and cloud metadata IP (169.254.169.254)", () => {
    expect(isSafeRemoteUrl("http://169.254.169.254/latest/meta-data/").safe).toBe(false);
  });

  it("blocks non-http/https protocols like file:// or ftp://", () => {
    expect(isSafeRemoteUrl("file:///etc/passwd").safe).toBe(false);
    expect(isSafeRemoteUrl("ftp://example.com/media.mp3").safe).toBe(false);
  });
});

describe("UrlInspectSchema", () => {
  it("validates legitimate URLs successfully", () => {
    const result = UrlInspectSchema.safeParse({
      url: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg",
    });
    expect(result.success).toBe(true);
  });

  it("rejects SSRF attempts in schema", () => {
    const result = UrlInspectSchema.safeParse({
      url: "http://127.0.0.1:8080/internal.mp4",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-URL strings", () => {
    const result = UrlInspectSchema.safeParse({
      url: "not a url",
    });
    expect(result.success).toBe(false);
  });
});

describe("ConvertRequestSchema", () => {
  const validUuid = "123e4567-e89b-12d3-a456-426614174000";

  it("validates correct convert request with fileId", () => {
    const result = ConvertRequestSchema.safeParse({
      fileId: validUuid,
      targetFormat: "mp3",
      audioBitrate: "192k",
    });
    expect(result.success).toBe(true);
  });

  it("validates correct convert request with directUrl", () => {
    const result = ConvertRequestSchema.safeParse({
      directUrl: "https://example.com/podcast.mp3",
      targetFormat: "wav",
    });
    expect(result.success).toBe(true);
  });

  it("fails when neither fileId nor directUrl is provided", () => {
    const result = ConvertRequestSchema.safeParse({
      targetFormat: "mp3",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid target formats", () => {
    const result = ConvertRequestSchema.safeParse({
      fileId: validUuid,
      targetFormat: "exe",
    });
    expect(result.success).toBe(false);
  });

  it("enforces trimEnd > trimStart", () => {
    const invalidTrim = ConvertRequestSchema.safeParse({
      fileId: validUuid,
      targetFormat: "mp3",
      trimStart: 20,
      trimEnd: 10,
    });
    expect(invalidTrim.success).toBe(false);

    const validTrim = ConvertRequestSchema.safeParse({
      fileId: validUuid,
      targetFormat: "mp3",
      trimStart: 10,
      trimEnd: 20,
    });
    expect(validTrim.success).toBe(true);
  });
});
