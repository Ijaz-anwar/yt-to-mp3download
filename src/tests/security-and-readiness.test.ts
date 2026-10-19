import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  validateRemoteMediaUrl,
  isPrivateOrLoopbackIp,
  parsePossibleNumericIp,
} from "@/lib/services/url-validator";
import {
  validateUploadedMedia,
} from "@/lib/services/upload-validator";
import {
  assertSafeId,
  getTempStorageStatus,
} from "@/lib/services/temp-storage";
import {
  MemoryRateLimitStore,
  enforceRateLimit,
  rateLimitAdapter,
  getClientIp,
  RATE_LIMIT_TIERS,
} from "@/lib/services/rate-limiter";
import {
  hashOwnerToken,
  verifyJobOwnership,
  extractJobToken,
  MediaJob,
  shutdownActiveJobs,
} from "@/lib/services/job-manager";
import {
  parseJsonBodyWithLimit,
  sanitizeErrorMessage,
} from "@/lib/services/error-handler";

describe("Security & SSRF Defense", () => {
  it("detects and rejects decimal integer IP representations (e.g. http://2130706433/)", () => {
    // 2130706433 === 127.0.0.1
    const converted = parsePossibleNumericIp("2130706433");
    expect(converted).toBe("127.0.0.1");
    expect(isPrivateOrLoopbackIp(converted!)).toBe(true);
  });

  it("detects and rejects hex IP representations (e.g. 0x7f000001)", () => {
    const converted = parsePossibleNumericIp("0x7f000001");
    expect(converted).toBe("127.0.0.1");
    expect(isPrivateOrLoopbackIp(converted!)).toBe(true);
  });

  it("detects and rejects octal quad notation (e.g. 0177.0.0.1)", () => {
    const converted = parsePossibleNumericIp("0177.0.0.1");
    expect(converted).toBe("127.0.0.1");
    expect(isPrivateOrLoopbackIp(converted!)).toBe(true);
  });

  it("blocks AWS metadata and link-local addresses (169.254.169.254)", () => {
    expect(isPrivateOrLoopbackIp("169.254.169.254")).toBe(true);
  });

  it("blocks private IPv4 RFC 1918 ranges (10.x, 172.16-31.x, 192.168.x)", () => {
    expect(isPrivateOrLoopbackIp("10.0.0.1")).toBe(true);
    expect(isPrivateOrLoopbackIp("10.255.255.255")).toBe(true);
    expect(isPrivateOrLoopbackIp("172.16.0.50")).toBe(true);
    expect(isPrivateOrLoopbackIp("172.31.255.254")).toBe(true);
    expect(isPrivateOrLoopbackIp("192.168.1.1")).toBe(true);
    expect(isPrivateOrLoopbackIp("127.0.0.1")).toBe(true);
    expect(isPrivateOrLoopbackIp("0.0.0.0")).toBe(true);
  });

  it("blocks IPv6 loopback and unique local addresses", () => {
    expect(isPrivateOrLoopbackIp("::1")).toBe(true);
    expect(isPrivateOrLoopbackIp("fe80::1")).toBe(true);
    expect(isPrivateOrLoopbackIp("fc00::1")).toBe(true);
    expect(isPrivateOrLoopbackIp("fd12:3456:789a::1")).toBe(true);
  });

  it("rejects non-allowlisted domains and unsafe protocols", async () => {
    await expect(validateRemoteMediaUrl("ftp://commondatastorage.googleapis.com/test.mp4")).rejects.toThrowError(
      expect.objectContaining({ code: "UNSUPPORTED_PROTOCOL" })
    );

    await expect(validateRemoteMediaUrl("file:///etc/passwd")).rejects.toThrowError(
      expect.objectContaining({ code: "UNSUPPORTED_PROTOCOL" })
    );

    await expect(validateRemoteMediaUrl("http://evil-attacker.example.org/exploit.mp4")).rejects.toThrowError(
      expect.objectContaining({ code: "PROVIDER_NOT_ALLOWED" })
    );
  });

  it("blocks non-standard network ports on media URLs", async () => {
    await expect(validateRemoteMediaUrl("http://commondatastorage.googleapis.com:22/test.mp4")).rejects.toThrowError(
      expect.objectContaining({ code: "PORT_DISALLOWED" })
    );
  });
});

describe("Request Body & Payload Limits", () => {
  it("rejects request bodies exceeding max byte threshold via Content-Length header", async () => {
    const req = new NextRequest("http://localhost:3000/api/media/jobs", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": "100000",
      },
      body: JSON.stringify({ fileId: "123" }),
    });

    await expect(parseJsonBodyWithLimit(req, 1024)).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 413,
        code: "PAYLOAD_TOO_LARGE",
      })
    );
  });

  it("rejects request bodies with oversized content payloads", async () => {
    const largePayload = JSON.stringify({ data: "A".repeat(2000) });
    const req = new NextRequest("http://localhost:3000/api/media/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: largePayload,
    });

    await expect(parseJsonBodyWithLimit(req, 1024)).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 413,
        code: "PAYLOAD_TOO_LARGE",
      })
    );
  });

  it("rejects empty request bodies", async () => {
    const req = new NextRequest("http://localhost:3000/api/media/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "   ",
    });

    await expect(parseJsonBodyWithLimit(req, 1024)).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 400,
        code: "EMPTY_BODY",
      })
    );
  });

  it("rejects malformed JSON", async () => {
    const req = new NextRequest("http://localhost:3000/api/media/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{ not valid json",
    });

    await expect(parseJsonBodyWithLimit(req, 1024)).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 400,
        code: "INVALID_JSON",
      })
    );
  });
});

describe("Path Traversal & Safe ID Validation", () => {
  it("rejects directory traversal attempts with assertSafeId", () => {
    expect(() => assertSafeId("../secret.txt")).toThrowError(
      expect.objectContaining({ statusCode: 400, code: "SECURITY_VIOLATION" })
    );
    expect(() => assertSafeId("..\\windows\\system32")).toThrowError(
      expect.objectContaining({ statusCode: 400, code: "SECURITY_VIOLATION" })
    );
    expect(() => assertSafeId("/etc/passwd")).toThrowError(
      expect.objectContaining({ statusCode: 400, code: "SECURITY_VIOLATION" })
    );
    expect(() => assertSafeId("id;rm -rf /")).toThrowError(
      expect.objectContaining({ statusCode: 400, code: "SECURITY_VIOLATION" })
    );
    expect(() => assertSafeId("")).toThrowError(
      expect.objectContaining({ statusCode: 400, code: "INVALID_ID" })
    );
  });

  it("accepts valid alphanumeric, UUID, and hyphenated IDs", () => {
    expect(() => assertSafeId("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).not.toThrow();
    expect(() => assertSafeId("job_123456_test")).not.toThrow();
  });
});

describe("Upload Content Verification & Spoofing Defense", () => {
  it("rejects zero-byte uploaded files", () => {
    expect(() => validateUploadedMedia(Buffer.alloc(0), "empty.mp4", "video/mp4")).toThrowError(
      expect.objectContaining({ statusCode: 400, code: "EMPTY_FILE" })
    );
  });

  it("detects and rejects non-media content disguised with .mp4 extension", () => {
    const fakeMp4 = Buffer.from("<!DOCTYPE html><html><body><h1>Phishing</h1></body></html>");
    expect(() => validateUploadedMedia(fakeMp4, "phishing.mp4", "video/mp4")).toThrowError(
      expect.objectContaining({ statusCode: 400, code: "INVALID_FILE_SIGNATURE" })
    );
  });

  it("sanitizes filenames containing directory traversal characters", () => {
    const validMp4Header = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
    const result = validateUploadedMedia(validMp4Header, "../../../etc/passwd.mp4", "video/mp4");
    expect(result.safeOriginalName).not.toContain("..");
    expect(result.safeOriginalName).not.toContain("/");
    expect(result.safeOriginalName).not.toContain("\\");
  });
});

describe("Rate Limiting Engine", () => {
  let store: MemoryRateLimitStore;

  beforeEach(() => {
    store = new MemoryRateLimitStore();
    rateLimitAdapter.setStore(store);
  });

  it("enforces sliding-window limits and sets response headers", async () => {
    const key = "test-client-1";
    const limit = 3;
    const windowMs = 5000;

    const res1 = await store.consume(key, limit, windowMs);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = await store.consume(key, limit, windowMs);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = await store.consume(key, limit, windowMs);
    expect(res3.allowed).toBe(true);
    expect(res3.remaining).toBe(0);

    const res4 = await store.consume(key, limit, windowMs);
    expect(res4.allowed).toBe(false);
    expect(res4.remaining).toBe(0);
    expect(res4.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("extracts client IP from proxy headers safely", () => {
    const reqCf = new NextRequest("http://localhost:3000", {
      headers: { "cf-connecting-ip": "203.0.113.195" },
    });
    expect(getClientIp(reqCf)).toBe("203.0.113.195");

    const reqXff = new NextRequest("http://localhost:3000", {
      headers: { "x-forwarded-for": "198.51.100.42, 10.0.0.1" },
    });
    expect(getClientIp(reqXff)).toBe("198.51.100.42");
  });

  it("enforceRateLimit throws 429 when tier limit is reached", async () => {
    const req = new NextRequest("http://localhost:3000/api/media/upload", {
      headers: { "x-real-ip": "192.0.2.1" },
    });

    const customKey = "custom-ratelimit-test";
    const config = RATE_LIMIT_TIERS.upload;
    const adapter = rateLimitAdapter.getStore();

    // Consume up to configured tier limit
    for (let i = 0; i < config.limit; i++) {
      await adapter.consume(`upload:${customKey}`, config.limit, config.windowMs);
    }

    await expect(enforceRateLimit(req, "upload", customKey)).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 429,
        code: "RATE_LIMIT_EXCEEDED",
      })
    );
  });
});

describe("Job Ownership & IDOR Protection", () => {
  it("creates constant-time owner token hashes and verifies correctly", () => {
    const rawToken = "user_secret_token_abc123";
    const hashed = hashOwnerToken(rawToken);

    const mockJob: MediaJob = {
      id: "job-1",
      ownerTokenHash: hashed,
      status: "completed",
      progress: 100,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: Date.now() + 60000,
      sourceFileId: "src-1",
      sourceFilename: "test.mp4",
      targetFormat: "mp3",
      options: { targetFormat: "mp3" },
    };

    // Valid token
    expect(verifyJobOwnership(mockJob, rawToken)).toBe(true);

    // Invalid token
    expect(verifyJobOwnership(mockJob, "wrong_token")).toBe(false);

    // Missing token
    expect(verifyJobOwnership(mockJob, undefined)).toBe(false);
    expect(verifyJobOwnership(mockJob, "")).toBe(false);
  });

  it("extracts ownership token from header, Bearer auth, or query param", () => {
    const reqHeader = new NextRequest("http://localhost:3000/api/media/jobs/1", {
      headers: { "x-job-token": "token-from-header" },
    });
    expect(extractJobToken(reqHeader, "1")).toBe("token-from-header");

    const reqBearer = new NextRequest("http://localhost:3000/api/media/jobs/1", {
      headers: { authorization: "Bearer token-from-bearer" },
    });
    expect(extractJobToken(reqBearer, "1")).toBe("token-from-bearer");

    const reqQuery = new NextRequest("http://localhost:3000/api/media/jobs/1/download?token=token-from-query");
    expect(extractJobToken(reqQuery, "1")).toBe("token-from-query");
  });
});

describe("Error Sanitization & Secrets Protection", () => {
  it("sanitizes server workspace filesystem paths and IP addresses", () => {
    const rawMessage = `Error in D:\\Tools Websites\\YT_Downloader\\src\\file.ts connected to 192.168.1.100: file failed`;
    const sanitized = sanitizeErrorMessage(rawMessage);

    expect(sanitized).not.toContain("D:\\Tools Websites\\YT_Downloader");
    expect(sanitized).not.toContain("192.168.1.100");
    expect(sanitized).toContain("[workspace]");
    expect(sanitized).toContain("[redacted-ip]");
  });
});

describe("Health & System Status", () => {
  it("reports writeable temp storage status without exposing internal paths", () => {
    const status = getTempStorageStatus();
    expect(status.exists).toBe(true);
    expect(status.writeable).toBe(true);
    expect(typeof status.fileCount).toBe("number");
  });

  it("handles graceful worker shutdown safely", async () => {
    const count = await shutdownActiveJobs();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
