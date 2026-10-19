import { NextRequest, NextResponse } from "next/server";
import { validateRemoteMediaUrl } from "@/lib/services/url-validator";
import { inspectRemoteMediaUrl } from "@/lib/media/remote-fetcher";
import { handleApiError, parseJsonBodyWithLimit, MediaError } from "@/lib/services/error-handler";
import { enforceRateLimit } from "@/lib/services/rate-limiter";

export async function POST(req: NextRequest) {
  try {
    const rlHeaders = await enforceRateLimit(req, "analyze");
    const body = await parseJsonBodyWithLimit<{ url?: string }>(req, 64 * 1024);
    const url = body?.url;

    if (!url) {
      throw new MediaError("Missing URL in request body.", 400, "BAD_REQUEST");
    }

    // Validate URL against scheme, SSRF, and provider allowlist
    await validateRemoteMediaUrl(url);

    const info = await inspectRemoteMediaUrl(url);

    return NextResponse.json(
      {
        success: true,
        info,
      },
      { headers: rlHeaders }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
