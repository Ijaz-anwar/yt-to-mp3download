import { test, expect } from "@playwright/test";

test.describe("YouTube Simple Downloader Flow (NotubeMP3D Style)", () => {
  test("user pastes YouTube link, clicks Convert, and sees MP3 and MP4 download buttons", async ({
    page,
  }) => {
    test.setTimeout(60000);
    // 1. Visit homepage
    await page.goto("/");

    // 2. Locate the main URL input
    const urlInput = page.getByPlaceholder(/Paste YouTube video URL here/i);
    await expect(urlInput).toBeVisible();

    // 3. Fill in YouTube URL
    await urlInput.fill("https://www.youtube.com/watch?v=jNQXAC9IVRw");

    // 4. Click the Convert button
    const convertBtn = page.getByRole("button", { name: "Convert YouTube Video" });
    await expect(convertBtn).toBeVisible();
    await convertBtn.click();

    // 5. Wait for the Video Result Card to appear
    await expect(page.getByText("Ready to Download")).toBeVisible({ timeout: 35000 });
    await expect(page.getByRole("heading", { name: "Me at the zoo" })).toBeVisible();

    // 6. Verify the TWO prominent download buttons are visible
    const mp3Btn = page.getByRole("button", { name: /Download MP3/i });
    const mp4Btn = page.getByRole("button", { name: /Download MP4/i });

    await expect(mp3Btn).toBeVisible();
    await expect(mp4Btn).toBeVisible();
    await expect(page.getByText("320 kbps Studio Quality Audio")).toBeVisible();
    await expect(page.getByText("Full HD 1080p / 720p Video")).toBeVisible();

    // 7. Click Download MP3 and verify download flow triggers
    await mp3Btn.click();

    // 8. Progress and completion
    await expect(page.getByText(/download has started/i)).toBeVisible({ timeout: 35000 });
    await expect(page.getByText("Convert Another Video")).toBeVisible();
  });
});
