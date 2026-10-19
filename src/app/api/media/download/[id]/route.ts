import { NextRequest } from "next/server";
import fs from "fs";
import { Readable } from "stream";
import { getMediaRecord } from "@/lib/media/storage";
import { assertSafeId } from "@/lib/services/temp-storage";
import { enforceRateLimit } from "@/lib/services/rate-limiter";
import { handleApiError, MediaError } from "@/lib/services/error-handler";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    assertSafeId(id);
    const rlHeaders = await enforceRateLimit(req, "download", id);

    const record = await getMediaRecord(id);
    if (!record || !fs.existsSync(record.filePath)) {
      throw new MediaError(
        "The requested file was not found or has expired.",
        404,
        "FILE_NOT_FOUND"
      );
    }

    const stat = await fs.promises.stat(record.filePath);
    const nodeStream = fs.createReadStream(record.filePath);
    const webStream = Readable.toWeb(nodeStream);

    const safeFilename = record.originalName.replace(/[^\w.-]/g, "_");

    const responseHeaders = new Headers({
      "Content-Type": record.mimeType || "application/octet-stream",
      "Content-Length": stat.size.toString(),
      "Content-Disposition": `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(
        record.originalName
      )}`,
      "Cache-Control": "private, max-age=3600",
    });
    rlHeaders.forEach((val, key) => responseHeaders.set(key, val));

    return new Response(webStream as unknown as BodyInit, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
