import { describe, it, expect } from "vitest";
import { verifyMediaEngine } from "../lib/media/ffmpeg-runner";

describe("verifyMediaEngine", () => {
  it("detects installed ffmpeg and ffprobe binaries", async () => {
    const result = await verifyMediaEngine();
    console.log("verifyMediaEngine result:", result);
    expect(result.ffmpeg).toBe(true);
    expect(result.ffprobe).toBe(true);
  });
});
