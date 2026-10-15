import { NextRequest, NextResponse } from "next/server";
import { UrlInspectSchema } from "@/lib/validation/schemas";
import { inspectRemoteMediaUrl } from "@/lib/media/remote-fetcher";


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = UrlInspectSchema.safeParse(body);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Invalid URL request.";
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const info = await inspectRemoteMediaUrl(parsed.data.url);

    return NextResponse.json({
      success: true,
      info,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to inspect remote URL.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
