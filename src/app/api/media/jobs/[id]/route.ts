import { NextRequest, NextResponse } from "next/server";
import {
  getJobById,
  cancelJobById,
  extractJobToken,
  verifyJobOwnership,
} from "@/lib/services/job-manager";
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

    const rlHeaders = await enforceRateLimit(req, "job_status", id);

    const job = await getJobById(id);
    if (!job) {
      throw new MediaError("Conversion job was not found or has expired.", 404, "JOB_NOT_FOUND");
    }

    const token = extractJobToken(req, id);
    if (!verifyJobOwnership(job, token)) {
      throw new MediaError("Access denied: invalid or missing job ownership authorization.", 403, "FORBIDDEN");
    }

    return NextResponse.json(
      {
        success: true,
        job: {
          id: job.id,
          status: job.status,
          progress: job.progress,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
          expiresAt: job.expiresAt,
          sourceFilename: job.sourceFilename,
          targetFormat: job.targetFormat,
          strategy: job.strategy,
          fidelityNotice: job.fidelityNotice,
          outputFilename: job.outputFilename,
          outputSize: job.outputSize,
          downloadUrl: job.downloadUrl,
          error: job.error,
          timeMs: job.timeMs,
          metadata: job.metadata,
        },
      },
      { headers: rlHeaders }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    assertSafeId(id);

    const rlHeaders = await enforceRateLimit(req, "job_create", id);

    const job = await getJobById(id);
    if (!job) {
      throw new MediaError("Job not found or already purged.", 404, "JOB_NOT_FOUND");
    }

    const token = extractJobToken(req, id);
    if (!verifyJobOwnership(job, token)) {
      throw new MediaError("Access denied: invalid or missing job ownership authorization.", 403, "FORBIDDEN");
    }

    const cancelled = await cancelJobById(id);
    if (!cancelled) {
      throw new MediaError("Job not found or already purged.", 404, "JOB_NOT_FOUND");
    }

    return NextResponse.json(
      {
        success: true,
        message: "Job cancelled and associated media files purged.",
      },
      { headers: rlHeaders }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
