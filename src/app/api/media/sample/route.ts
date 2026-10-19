import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { probeMediaFile, getFfmpegPath } from "@/lib/media/ffmpeg-runner";
import { registerOutputFile, allocateOutputPath } from "@/lib/services/temp-storage";
import { getMediaCapabilities } from "@/lib/services/format-capabilities";

export async function POST(req: NextRequest) {
  try {
    const { type = "audio" } = await req.json().catch(() => ({ type: "audio" }));

    const isVideo = type === "video";
    const ext = isVideo ? "mp4" : "wav";
    const filename = isVideo ? "sample-demo-pattern.mp4" : "sample-demo-tone.wav";
    const mimeType = isVideo ? "video/mp4" : "audio/wav";

    const { id, filePath, expiresAt } = allocateOutputPath(ext);

    let args: string[];
    if (isVideo) {
      args = [
        "-f",
        "lavfi",
        "-i",
        "testsrc=duration=2:size=640x360:rate=30",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:duration=2",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-y",
        filePath,
      ];
    } else {
      args = [
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=528:duration=2",
        "-c:a",
        "pcm_s16le",
        "-y",
        filePath,
      ];
    }

    await new Promise<void>((resolve, reject) => {
      execFile(getFfmpegPath(), args, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const record = await registerOutputFile(
      id,
      filePath,
      filename,
      mimeType,
      expiresAt
    );

    const metadata = await probeMediaFile(
      record.filePath,
      record.id,
      record.originalName
    );

    const capabilities = getMediaCapabilities(metadata);

    return NextResponse.json({
      success: true,
      fileId: record.id,
      record: {
        id: record.id,
        filename: record.originalName,
        size: record.size,
        mimeType: record.mimeType,
      },
      metadata,
      capabilities,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate demo sample.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
