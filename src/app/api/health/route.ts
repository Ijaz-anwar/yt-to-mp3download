import { NextResponse } from "next/server";
import { verifyMediaEngine } from "@/lib/media/ffmpeg-runner";
import { SITE_CONFIG } from "@/config/site";


export async function GET() {
  try {
    const engine = await verifyMediaEngine();

    return NextResponse.json({
      status: "healthy",
      service: SITE_CONFIG.name,
      timestamp: new Date().toISOString(),
      engine: {
        ffmpegAvailable: engine.ffmpeg,
        ffprobeAvailable: engine.ffprobe,
        ffmpegVersion: engine.ffmpegVersion,
        ffprobeVersion: engine.ffprobeVersion,
      },
      limits: {
        maxUploadMb: SITE_CONFIG.maxUploadSizeBytes / (1024 * 1024),
        maxRemoteMb: SITE_CONFIG.maxRemoteSizeBytes / (1024 * 1024),
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "degraded",
        error: err instanceof Error ? err.message : "Health check failure",
      },
      { status: 500 }
    );
  }
}
