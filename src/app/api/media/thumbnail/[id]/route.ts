import { NextRequest } from "next/server";
import fs from "fs";
import { Readable } from "stream";
import { getThumbnailPath } from "@/lib/media/storage";
import { assertSafeId } from "@/lib/services/temp-storage";
import { handleApiError, MediaError } from "@/lib/services/error-handler";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    assertSafeId(id);

    const thumbPath = getThumbnailPath(id);
    if (!fs.existsSync(thumbPath)) {
      throw new MediaError("Thumbnail not found.", 404, "NOT_FOUND");
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
    return handleApiError(err);
  }
}
