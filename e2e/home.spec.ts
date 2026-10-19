import { test, expect } from "@playwright/test";

test.describe("MediaNest YouTube MP3 & MP4 Downloader Website", () => {
  test("renders homepage, main heading, and header navigation", async ({ page }) => {
    await page.goto("/");

    // Verify Title & Brand
    await expect(page).toHaveTitle(/MediaNest/i);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Download YouTube Videos as MP3 or MP4"
    );

    // Verify Header navigation links
    const nav = page.getByRole("navigation", { name: "Main Navigation" });
    await expect(nav.getByRole("button", { name: /^Home$/i })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^How It Works$/i })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^FAQ$/i })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Contact$/i })).toBeVisible();
  });

  test("verifies hero input controls, paste button, and convert action", async ({ page }) => {
    await page.goto("/");

    // URL input and paste button
    const urlInput = page.getByPlaceholder(/Paste YouTube video URL here/i);
    await expect(urlInput).toBeVisible();

    const pasteBtn = page.getByRole("button", { name: /Paste/i });
    await expect(pasteBtn).toBeVisible();

    // Primary action
    const convertBtn = page.getByRole("button", { name: "Convert YouTube Video" });
    await expect(convertBtn).toBeVisible();
  });

  test("verifies How It Works, Available Download Formats, and Why Use sections", async ({ page }) => {
    await page.goto("/");

    // How it works
    await expect(page.getByRole("heading", { name: "How to Download YouTube Videos" })).toBeVisible();
    await expect(page.getByText("01", { exact: true })).toBeVisible();
    await expect(page.getByText("02", { exact: true })).toBeVisible();
    await expect(page.getByText("03", { exact: true })).toBeVisible();

    // Available Download Formats (MP3 and MP4 only)
    await expect(page.getByRole("heading", { name: "Available Download Formats" })).toBeVisible();
    await expect(page.getByText("MP3 Audio Download", { exact: true })).toBeVisible();
    await expect(page.getByText("MP4 Video Download", { exact: true })).toBeVisible();

    // Why Use MediaNest
    await expect(page.getByRole("heading", { name: "Why Use MediaNest?" })).toBeVisible();
    await expect(page.getByText("One-Field Simplicity")).toBeVisible();
    await expect(page.getByText("No Registration or Proxy")).toBeVisible();
  });

  test("verifies FAQ accordion expand and collapse interaction", async ({ page }) => {
    await page.goto("/");

    const faqHeading = page.getByRole("heading", { name: "Frequently Asked Questions" });
    await expect(faqHeading).toBeVisible();

    // Check first question is initially expanded
    const q1Btn = page.getByRole("button", { name: /How do I download a YouTube video as MP3 or MP4/i });
    await expect(q1Btn).toBeVisible();

    // Click second question
    const q2Btn = page.getByRole("button", { name: /What download formats are available/i });
    await q2Btn.click();

    // Answer should become visible
    await expect(
      page.getByText("We provide two direct options for every YouTube video")
    ).toBeVisible();

    // Click again to toggle collapse
    await q2Btn.click();
    await expect(
      page.getByText("We provide two direct options for every YouTube video")
    ).not.toBeVisible();
  });

  test("verifies footer links and copyright", async ({ page }) => {
    await page.goto("/");

    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer).toContainText("2026 MediaNest");
    await expect(footer.getByText("Terms of Service").first()).toBeVisible();
    await expect(footer.getByText("Privacy Policy").first()).toBeVisible();
  });
});
