import { describe, it, expect, beforeEach } from "vitest";
import {
  isPrivateIPv4,
  isPrivateIPv6,
  isAllowedProvider,
  validateRemoteMediaUrl,
} from "@/lib/services/url-validator";
import {
  detectMediaSignature,
  validateUploadedMedia,
} from "@/lib/services/upload-validator";
import {
  getMediaCapabilities,
  validateConversionCapabilities,
} from "@/lib/services/format-capabilities";
import { MemoryJobStore } from "@/lib/services/job-manager";
import { MediaError } from "@/lib/services/error-handler";

describe("URL Validator Service", () => {
  it("correctly identifies private and loopback IPv4 addresses", () => {
    expect(isPrivateIPv4("127.0.0.1")).toBe(true);
    expect(isPrivateIPv4("127.255.255.255")).toBe(true);
    expect(isPrivateIPv4("10.0.0.1")).toBe(true);
    expect(isPrivateIPv4("192.168.1.1")).toBe(true);
    expect(isPrivateIPv4("172.16.0.1")).toBe(true);
    expect(isPrivateIPv4("172.31.255.255")).toBe(true);
    expect(isPrivateIPv4("169.254.169.254")).toBe(true); // AWS / Cloud metadata
    expect(isPrivateIPv4("0.0.0.0")).toBe(true);

    // Public IPv4 addresses should not be flagged as private
    expect(isPrivateIPv4("8.8.8.8")).toBe(false);
    expect(isPrivateIPv4("1.1.1.1")).toBe(false);
    expect(isPrivateIPv4("142.250.190.46")).toBe(false);
  });

  it("correctly identifies private IPv6 addresses", () => {
    expect(isPrivateIPv6("::1")).toBe(true);
    expect(isPrivateIPv6("::")).toBe(true);
    expect(isPrivateIPv6("fc00::1")).toBe(true);
    expect(isPrivateIPv6("fd12:3456:789a:1::1")).toBe(true);
    expect(isPrivateIPv6("fe80::1")).toBe(true);
    expect(isPrivateIPv6("::ffff:127.0.0.1")).toBe(true);

    // Public IPv6
    expect(isPrivateIPv6("2001:4860:4860::8888")).toBe(false);
  });

  it("permits authorized provider domains", () => {
    expect(isAllowedProvider("actions.google.com")).toBe(true);
    expect(isAllowedProvider("archive.org")).toBe(true);
    expect(isAllowedProvider("ia800201.us.archive.org")).toBe(true);
    expect(isAllowedProvider("upload.wikimedia.org")).toBe(true);
    expect(isAllowedProvider("librivox.org")).toBe(true);
    expect(isAllowedProvider("raw.githubusercontent.com")).toBe(true);
    expect(isAllowedProvider("cdn.pixabay.com")).toBe(true);
  });

  it("rejects unauthorized domains", () => {
    expect(isAllowedProvider("malicious-site.xyz")).toBe(false);
    expect(isAllowedProvider("evilcorp.internal")).toBe(false);
  });

  it("permits authorized YouTube URLs", async () => {
    const res = await validateRemoteMediaUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(res.hostname).toBe("www.youtube.com");
  });

  it("rejects restricted proprietary platforms with informative messages", async () => {
    await expect(validateRemoteMediaUrl("https://www.tiktok.com/@user/video/12345")).rejects.toThrow(
      /MediaNest does not support downloading from TikTok/
    );
    await expect(validateRemoteMediaUrl("https://www.instagram.com/reel/12345")).rejects.toThrow(
      /MediaNest does not support downloading from Instagram/
    );
    await expect(validateRemoteMediaUrl("https://twitter.com/user/status/12345")).rejects.toThrow(
      /MediaNest does not support downloading from Twitter/
    );
  });

  it("rejects non-allowlisted domains with informative message", async () => {
    await expect(validateRemoteMediaUrl("https://example.com/stream.mp4")).rejects.toThrow(
      /is not on the authorized public media provider allowlist/
    );
  });
});

describe("Upload Validator Service", () => {
  it("detects MP4 ISO containers from magic bytes", () => {
    // 00 00 00 18 'ftyp' 'isom'
    const mp4Header = Buffer.from([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
    ]);
    const sig = detectMediaSignature(mp4Header);
    expect(sig).not.toBeNull();
    expect(sig?.format).toBe("mp4");
    expect(sig?.category).toBe("video");
  });

  it("detects M4A audio from magic bytes", () => {
    // 00 00 00 20 'ftyp' 'M4A '
    const m4aHeader = Buffer.from([
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41, 0x20,
    ]);
    const sig = detectMediaSignature(m4aHeader);
    expect(sig).not.toBeNull();
    expect(sig?.format).toBe("m4a");
    expect(sig?.category).toBe("audio");
  });

  it("detects WebM / Matroska containers from EBML header", () => {
    // 1A 45 DF A3 ... 'webm'
    const webmHeader = Buffer.concat([
      Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01]),
      Buffer.from("webm", "ascii"),
    ]);
    const sig = detectMediaSignature(webmHeader);
    expect(sig).not.toBeNull();
    expect(sig?.format).toBe("webm");
    expect(sig?.category).toBe("video");
  });

  it("detects WAV from RIFF....WAVE header", () => {
    // 'RIFF' + 4 dummy bytes + 'WAVE'
    const wavHeader = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
    ]);
    const sig = detectMediaSignature(wavHeader);
    expect(sig).not.toBeNull();
    expect(sig?.format).toBe("wav");
    expect(sig?.category).toBe("audio");
  });

  it("detects FLAC from fLaC header", () => {
    const flacHeader = Buffer.from([
      0x66, 0x4c, 0x61, 0x43, 0x00, 0x00, 0x00, 0x22, 0x10, 0x00, 0x10, 0x00,
    ]);
    const sig = detectMediaSignature(flacHeader);
    expect(sig).not.toBeNull();
    expect(sig?.format).toBe("flac");
    expect(sig?.category).toBe("audio");
  });

  it("detects OGG from OggS header", () => {
    const oggHeader = Buffer.from([
      0x4f, 0x67, 0x67, 0x53, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
    const sig = detectMediaSignature(oggHeader);
    expect(sig).not.toBeNull();
    expect(sig?.format).toBe("ogg");
    expect(sig?.category).toBe("audio");
  });

  it("detects MP3 with ID3v2 tag", () => {
    const mp3Header = Buffer.from([
      0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x20, 0x00, 0x00,
    ]);
    const sig = detectMediaSignature(mp3Header);
    expect(sig).not.toBeNull();
    expect(sig?.format).toBe("mp3");
    expect(sig?.category).toBe("audio");
  });

  it("rejects non-media files disguised as mp4", () => {
    const fakeFile = Buffer.from("<html><script>alert(1)</script></html>");
    expect(detectMediaSignature(fakeFile)).toBeNull();

    expect(() =>
      validateUploadedMedia(fakeFile, "attack.mp4", "video/mp4")
    ).toThrow(MediaError);
  });

  it("rejects unsupported file extensions", () => {
    const buffer = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
    expect(() =>
      validateUploadedMedia(buffer, "malicious.exe", "application/octet-stream")
    ).toThrow(/extension "\.exe" is not supported/);
  });
});

describe("Format Capabilities Service", () => {
  it("disables video target formats for audio-only sources", () => {
    const audioMeta = {
      id: "audio-1",
      filename: "song.mp3",
      format: "mp3",
      size: 1024000,
      mimeType: "audio/mpeg",
      hasAudio: true,
      hasVideo: false,
    };

    const caps = getMediaCapabilities(audioMeta);
    expect(caps.hasVideo).toBe(false);
    expect(caps.hasAudio).toBe(true);
    expect(caps.availableVideoFormats).toHaveLength(0);
    expect(caps.availableAudioFormats.length).toBeGreaterThan(0);
    expect(caps.recommendedFormat).toBe("mp3");

    // Validating conversion to video should throw
    expect(() =>
      validateConversionCapabilities(audioMeta, "mp4")
    ).toThrow(/Cannot convert audio-only media to video format/);

    // Validating conversion to audio should pass
    expect(() =>
      validateConversionCapabilities(audioMeta, "wav")
    ).not.toThrow();
  });

  it("enables both video and audio target formats for video sources", () => {
    const videoMeta = {
      id: "vid-1",
      filename: "clip.mp4",
      format: "mp4",
      size: 5000000,
      mimeType: "video/mp4",
      hasAudio: true,
      hasVideo: true,
      videoWidth: 1920,
      videoHeight: 1080,
    };

    const caps = getMediaCapabilities(videoMeta);
    expect(caps.hasVideo).toBe(true);
    expect(caps.availableVideoFormats.length).toBeGreaterThan(0);
    expect(caps.availableAudioFormats.length).toBeGreaterThan(0);
    expect(caps.availableResolutions).toContain("1080p");
    expect(caps.availableResolutions).toContain("720p");
    expect(caps.recommendedFormat).toBe("mp4");

    // Both video and audio extractions should be permitted
    expect(() => validateConversionCapabilities(videoMeta, "mp4")).not.toThrow();
    expect(() => validateConversionCapabilities(videoMeta, "mp3")).not.toThrow();
  });
});

describe("Job Manager Service", () => {
  let store: MemoryJobStore;

  beforeEach(() => {
    store = new MemoryJobStore();
  });

  it("creates a job with queued status and UUID", async () => {
    const job = await store.create({
      sourceFileId: "source-123",
      sourceFilename: "test.mp4",
      targetFormat: "mp3",
      options: { targetFormat: "mp3" },
    });

    expect(job.id).toBeDefined();
    expect(job.status).toBe("queued");
    expect(job.progress).toBe(0);
    expect(job.targetFormat).toBe("mp3");
  });

  it("updates job progress and status cleanly", async () => {
    const job = await store.create({
      sourceFileId: "source-123",
      sourceFilename: "test.mp4",
      targetFormat: "mp3",
      options: { targetFormat: "mp3" },
    });

    const updated = await store.update(job.id, {
      status: "processing",
      progress: 50,
    });

    expect(updated.status).toBe("processing");
    expect(updated.progress).toBe(50);

    const fetched = await store.get(job.id);
    expect(fetched?.status).toBe("processing");
    expect(fetched?.progress).toBe(50);
  });

  it("deletes a job from the store", async () => {
    const job = await store.create({
      sourceFileId: "source-123",
      sourceFilename: "test.mp4",
      targetFormat: "mp3",
      options: { targetFormat: "mp3" },
    });

    const deleted = await store.delete(job.id);
    expect(deleted).toBe(true);

    const check = await store.get(job.id);
    expect(check).toBeNull();
  });
});
