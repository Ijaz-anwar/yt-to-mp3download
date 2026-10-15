import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { Readable } from "stream";
import { getThumbnailPath } from "@/lib/media/storage";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id || id.includes("..") || id.includes("/") || id.includes("\\")) {
      return NextResponse.json({ error: "Invalid thumbnail ID" }, { status: 400 });
    }

    const thumbPath = getThumbnailPath(id);
    if (!fs.existsSync(thumbPath)) {
      return NextResponse.json({ error: "Thumbnail not found" }, { status: 404 });
    }

    const stat = await fs.promises.stat(thumbPath);
    const nodeStream = fs.createReadStream(thumbPath);
    const webStream = Readable.toWeb(nodeStream);

    return new Response(webStream as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": stat.size.toString(),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error serving thumbnail";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
