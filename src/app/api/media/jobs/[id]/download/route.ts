import { NextRequest } from "next/server";
import {
  getJobById,
  extractJobToken,
  verifyJobOwnership,
} from "@/lib/services/job-manager";
import { createDownloadResponse } from "@/lib/services/download-service";
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

    const job = await getJobById(id);
    if (!job) {
      throw new MediaError("Conversion job was not found or has expired.", 404, "JOB_NOT_FOUND");
    }

    const token = extractJobToken(req, id);
    if (!verifyJobOwnership(job, token)) {
      throw new MediaError("Access denied: invalid or missing download authorization token.", 403, "FORBIDDEN");
    }

    if (job.status === "expired" || Date.now() > job.expiresAt) {
      throw new MediaError("Conversion job has expired.", 410, "JOB_EXPIRED");
    }

    if (job.status === "processing" || job.status === "queued") {
      throw new MediaError(
        "Media conversion is still in progress. Please check again when completed.",
        409,
        "JOB_NOT_READY"
      );
    }

    if (job.status === "failed") {
      throw new MediaError(
        `Cannot download: media conversion failed (${job.error || "unknown error"}).`,
        400,
        "JOB_FAILED"
      );
    }

    if (job.status === "cancelled") {
      throw new MediaError("Cannot download: job was cancelled.", 410, "JOB_CANCELLED");
    }

    if (!job.outputFileId) {
      throw new MediaError("Output media file was purged or missing.", 404, "FILE_NOT_FOUND");
    }

    const downloadResponse = await createDownloadResponse(job.outputFileId, job.outputFilename);
    // Append rate limit headers
    rlHeaders.forEach((val, key) => {
      downloadResponse.headers.set(key, val);
    });
    return downloadResponse;
  } catch (error) {
    return handleApiError(error);
  }
}
