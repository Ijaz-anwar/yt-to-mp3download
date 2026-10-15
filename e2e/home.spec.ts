import { test, expect } from "@playwright/test";

test.describe("MediaNest Media Utility Website", () => {
  test("renders homepage, main heading, and header navigation", async ({ page }) => {
    await page.goto("/");

    // Verify Title & Brand
    await expect(page).toHaveTitle(/MediaNest/i);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Download and Convert Media in One Simple Place"
    );

    // Verify Header navigation links
    const nav = page.getByRole("navigation", { name: "Main Navigation" });
    await expect(nav.getByRole("button", { name: /^Home$/i })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Video Downloader$/i })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Audio Converter$/i })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^How It Works$/i })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^FAQ$/i })).toBeVisible();
  });

  test("verifies hero input controls, paste button, and rights notice", async ({ page }) => {
    await page.goto("/");

    // URL input and paste button
    const urlInput = page.getByPlaceholder("Paste direct media link");
    await expect(urlInput).toBeVisible();

    const pasteBtn = page.getByRole("button", { name: /Paste/i });
    await expect(pasteBtn).toBeVisible();

    // Primary action
    const analyzeBtn = page.getByRole("button", { name: /Analyze Media/i });
    await expect(analyzeBtn).toBeVisible();

    // Local file option
    await expect(page.getByRole("button", { name: /Browse Device Files/i })).toBeVisible();

    // Rights notice
    await expect(page.getByText("Supported Sources & Rights Notice")).toBeVisible();
  });

  test("verifies How It Works, Supported Formats, and Why Choose sections", async ({ page }) => {
    await page.goto("/");

    // How it works
    await expect(page.getByRole("heading", { name: "How MediaNest Works" })).toBeVisible();
    await expect(page.getByText("01", { exact: true })).toBeVisible();
    await expect(page.getByText("02", { exact: true })).toBeVisible();
    await expect(page.getByText("03", { exact: true })).toBeVisible();

    // Supported Formats
    await expect(page.getByRole("heading", { name: "Supported Media Formats" })).toBeVisible();
    await expect(page.getByText("MP4 Video")).toBeVisible();
    await expect(page.getByText("WebM Video")).toBeVisible();
    await expect(page.getByText("MP3 Audio")).toBeVisible();
    await expect(page.getByText("M4A Audio")).toBeVisible();

    // Why Choose MediaNest
    await expect(page.getByRole("heading", { name: "Why Choose MediaNest?" })).toBeVisible();
    await expect(page.getByText("Native FFmpeg Processing")).toBeVisible();
    await expect(page.getByText("SSRF Network Security Shield")).toBeVisible();
  });

  test("verifies FAQ accordion expand and collapse interaction", async ({ page }) => {
    await page.goto("/");

    const faqHeading = page.getByRole("heading", { name: "Frequently Asked Questions" });
    await expect(faqHeading).toBeVisible();

    // Check first question is initially expanded
    const q1Btn = page.getByRole("button", { name: /What media sources are supported by MediaNest/i });
    await expect(q1Btn).toBeVisible();

    // Click second question: "Does MediaNest support YouTube or DRM-protected streams?"
    const q2Btn = page.getByRole("button", { name: /Does MediaNest support YouTube or DRM-protected streams/i });
    await q2Btn.click();

    // Answer should become visible
    await expect(
      page.getByText("In strict accordance with applicable terms and intellectual property standards")
    ).toBeVisible();

    // Click again to toggle collapse
    await q2Btn.click();
    await expect(
      page.getByText("In strict accordance with applicable terms and intellectual property standards")
    ).not.toBeVisible();
  });

  test("verifies footer links and copyright", async ({ page }) => {
    await page.goto("/");

    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer).toContainText("2026 MediaNest");
    await expect(footer.getByText("Terms & Compliance")).toBeVisible();
    await expect(footer.getByText("Privacy Policy")).toBeVisible();
    await expect(footer.getByRole("link", { name: /Contact/i })).toBeVisible();
  });

  test("health endpoint returns healthy engine status", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe("healthy");
    expect(data.engine.ffmpegAvailable).toBe(true);
    expect(data.engine.ffprobeAvailable).toBe(true);
  });
});
