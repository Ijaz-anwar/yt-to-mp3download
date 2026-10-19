import { NextResponse } from "next/server";
import { verifyMediaEngine } from "@/lib/media/ffmpeg-runner";
import { getTempStorageStatus } from "@/lib/services/temp-storage";
import { SITE_CONFIG } from "@/config/site";

export async function GET() {
  try {
    const engine = await verifyMediaEngine();
    const storage = getTempStorageStatus();

    const isHealthy = Boolean(
      engine.ffmpeg && engine.ffprobe && storage.writeable && storage.exists
    );

    const mem = process.memoryUsage();

    return NextResponse.json(
      {
        status: isHealthy ? "healthy" : "degraded",
        service: SITE_CONFIG.name,
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.round(process.uptime()),
        storage: {
          writeable: storage.writeable,
          fileCount: storage.fileCount,
        },
        engine: {
          ffmpegAvailable: engine.ffmpeg,
          ffprobeAvailable: engine.ffprobe,
          ffmpegVersion: engine.ffmpegVersion,
          ffprobeVersion: engine.ffprobeVersion,
        },
        memory: {
          rssMb: Math.round(mem.rss / (1024 * 1024)),
          heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
          heapTotalMb: Math.round(mem.heapTotal / (1024 * 1024)),
        },
        limits: {
          maxUploadMb: SITE_CONFIG.maxUploadSizeBytes / (1024 * 1024),
          maxRemoteMb: SITE_CONFIG.maxRemoteSizeBytes / (1024 * 1024),
        },
      },
      {
        status: isHealthy ? 200 : 503,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
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
