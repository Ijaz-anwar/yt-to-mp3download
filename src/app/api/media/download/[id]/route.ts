import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { Readable } from "stream";
import { getMediaRecord } from "@/lib/media/storage";


export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Missing file ID parameter." }, { status: 400 });
    }

    const record = await getMediaRecord(id);
    if (!record || !fs.existsSync(record.filePath)) {
      return NextResponse.json(
        { error: "The requested file was not found or has expired." },
        { status: 404 }
      );
    }

    const stat = await fs.promises.stat(record.filePath);
    const nodeStream = fs.createReadStream(record.filePath);
    const webStream = Readable.toWeb(nodeStream);

    const safeFilename = record.originalName.replace(/[^\w.-]/g, "_");

    return new Response(webStream as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": record.mimeType || "application/octet-stream",
        "Content-Length": stat.size.toString(),
        "Content-Disposition": `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(
          record.originalName
        )}`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to serve download.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
