import fs from "fs";
import { NextResponse } from "next/server";
import { getFileRecord } from "./temp-storage";
import { MediaError } from "./error-handler";
import { sanitizeFilename } from "../utils/format";

/**
 * Creates a streaming download response for a stored file
 */
export async function createDownloadResponse(fileId: string, customDownloadName?: string): Promise<NextResponse> {
  const record = await getFileRecord(fileId);
  if (!record || !fs.existsSync(record.filePath)) {
    throw new MediaError("The requested file was not found or has expired.", 404, "FILE_NOT_FOUND");
  }

  const stat = await fs.promises.stat(record.filePath);
  const downloadFilename = sanitizeFilename(customDownloadName || record.originalName, "media_download");

  // Create Web ReadableStream from Node.js stream
  const nodeStream = fs.createReadStream(record.filePath);
  const webStream = new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk: string | Buffer) => {
        const u8 = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
        controller.enqueue(new Uint8Array(u8));
      });
      nodeStream.on("end", () => {
        controller.close();
      });
      nodeStream.on("error", (err) => {
        controller.error(err);
      });
    },
    cancel() {
      nodeStream.destroy();
    },
  });

  const headers = new Headers();
  headers.set("Content-Type", record.mimeType || "application/octet-stream");
  headers.set("Content-Length", stat.size.toString());
  headers.set(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(downloadFilename)}"; filename*=UTF-8''${encodeURIComponent(
      downloadFilename
    )}`
  );
  headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate");
  headers.set("X-Content-Type-Options", "nosniff");

  return new NextResponse(webStream, {
    status: 200,
    headers,
  });
}
