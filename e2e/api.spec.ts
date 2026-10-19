import { test, expect } from "@playwright/test";

test.describe("MediaNest Backend API Pipeline", () => {
  test("POST /api/media/analyze rejects SSRF and restricted platform URLs", async ({ request }) => {
    // 1. Restricted proprietary platform rejection (e.g. TikTok)
    const ttRes = await request.post("/api/media/analyze", {
      data: { url: "https://www.tiktok.com/@user/video/12345" },
    });
    expect(ttRes.status()).toBe(400);
    const ttData = await ttRes.json();
    expect(ttData.success).toBe(false);
    expect(ttData.error.code).toBe("RESTRICTED_PROVIDER");

    // 2. YouTube URL acceptance
    const ytRes = await request.post("/api/media/analyze", {
      data: { url: "https://www.youtube.com/watch?v=jNQXAC9IVRw" },
      timeout: 45000,
    });
    expect(ytRes.status()).toBe(200);
    const ytData = await ytRes.json();
    expect(ytData.success).toBe(true);
    expect(ytData.sourceType).toBe("youtube");

    // 2. Localhost SSRF rejection
    const ssrfRes = await request.post("/api/media/analyze", {
      data: { url: "http://127.0.0.1:8080/secret.mp4" },
    });
    expect(ssrfRes.status()).toBe(400);
    const ssrfData = await ssrfRes.json();
    expect(ssrfData.success).toBe(false);
    expect(ssrfData.error.code).toBe("SSRF_BLOCKED");

    // 3. Cloud metadata SSRF rejection
    const metaRes = await request.post("/api/media/analyze", {
      data: { url: "http://169.254.169.254/latest/meta-data/" },
    });
    expect(metaRes.status()).toBe(400);
  });

  test("POST /api/media/jobs validates target format and requires existing file", async ({ request }) => {
    const res = await request.post("/api/media/jobs", {
      data: {
        fileId: "00000000-0000-0000-0000-000000000000",
        targetFormat: "mp3",
      },
    });
    expect(res.status()).toBe(404);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  test("GET /api/media/jobs/[id] returns 404 for non-existent job", async ({ request }) => {
    const res = await request.get("/api/media/jobs/00000000-0000-0000-0000-000000000000");
    expect(res.status()).toBe(404);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  test("Full End-to-End Transcoding Pipeline: sample -> analyze -> job -> poll -> download -> delete", async ({
    request,
  }) => {
    // 1. Generate test media sample
    const sampleRes = await request.post("/api/media/sample", {
      data: { type: "audio" },
    });
    expect(sampleRes.ok()).toBeTruthy();
    const sampleData = await sampleRes.json();
    const fileId = sampleData.record.id;
    expect(fileId).toBeDefined();

    // 2. Analyze the staged file
    const analyzeRes = await request.post("/api/media/analyze", {
      data: { fileId },
    });
    expect(analyzeRes.ok()).toBeTruthy();
    const analyzeData = await analyzeRes.json();
    expect(analyzeData.success).toBe(true);
    expect(analyzeData.capabilities).toBeDefined();
    expect(analyzeData.capabilities.hasAudio).toBe(true);

    // 3. Create conversion job
    const jobRes = await request.post("/api/media/jobs", {
      data: {
        fileId,
        targetFormat: "wav",
      },
    });
    expect(jobRes.status()).toBe(201);
    const jobData = await jobRes.json();
    expect(jobData.success).toBe(true);
    const jobId = jobData.job.id;
    expect(jobId).toBeDefined();

    // 4. Poll job status until completed (timeout after 15s)
    let isCompleted = false;
    let pollCount = 0;
    while (!isCompleted && pollCount < 30) {
      await new Promise((r) => setTimeout(r, 500));
      const statusRes = await request.get(`/api/media/jobs/${jobId}`);
      expect(statusRes.ok()).toBeTruthy();
      const current = await statusRes.json();
      if (current.job.status === "completed") {
        isCompleted = true;
        expect(current.job.outputFilename).toContain(".wav");
        expect(current.job.downloadUrl).toBeDefined();
        break;
      }
      if (current.job.status === "failed") {
        throw new Error(`Job failed: ${current.job.error}`);
      }
      pollCount++;
    }

    expect(isCompleted).toBe(true);

    // 5. Download the converted stream
    const downloadRes = await request.get(`/api/media/jobs/${jobId}/download`);
    expect(downloadRes.ok()).toBeTruthy();
    expect(downloadRes.headers()["content-disposition"]).toContain("attachment");
    expect(downloadRes.headers()["content-type"]).toContain("audio/wav");
    const downloadBuffer = await downloadRes.body();
    expect(downloadBuffer.length).toBeGreaterThan(0);

    // 6. Delete / cancel job
    const deleteRes = await request.delete(`/api/media/jobs/${jobId}`);
    expect(deleteRes.ok()).toBeTruthy();
    const deleteData = await deleteRes.json();
    expect(deleteData.success).toBe(true);
  });
});
