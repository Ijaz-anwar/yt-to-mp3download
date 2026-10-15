import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { Readable } from "stream";
import { getMediaRecord } from "@/lib/media/storage";


export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Missing file ID." }, { status: 400 });
    }

    const record = await getMediaRecord(id);
    if (!record || !fs.existsSync(record.filePath)) {
      return NextResponse.json({ error: "Media file not found." }, { status: 404 });
    }

    const stat = await fs.promises.stat(record.filePath);
    const fileSize = stat.size;
    const range = req.headers.get("range");

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        return new Response(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
          },
        });
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(record.filePath, { start, end });
      const webStream = Readable.toWeb(fileStream);

      return new Response(webStream as unknown as BodyInit, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": record.mimeType || "application/octet-stream",
          "Content-Disposition": "inline",
        },
      });
    }

    const fileStream = fs.createReadStream(record.filePath);
    const webStream = Readable.toWeb(fileStream);

    return new Response(webStream as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Length": fileSize.toString(),
        "Content-Type": record.mimeType || "application/octet-stream",
        "Accept-Ranges": "bytes",
        "Content-Disposition": "inline",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to stream preview.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
