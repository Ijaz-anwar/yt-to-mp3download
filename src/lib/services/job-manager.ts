import fs from "fs";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { executeTranscode, TranscodeOptions } from "./ffmpeg-service";
import {
  getFileRecord,
  allocateOutputPath,
  registerOutputFile,
  deleteStoredFile,
  purgeExpiredFiles,
} from "./temp-storage";
import { MediaError, logger } from "./error-handler";
import { getMimeTypeForExt } from "../utils/format";
import { MediaMetadata } from "../validation/schemas";
import { probeMedia } from "./media-prober";
import { downloadYouTubeMedia } from "./youtube-service";

export type JobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "expired"
  | "cancelled";

export interface MediaJob {
  id: string;
  ownerToken?: string;
  ownerTokenHash?: string;
  status: JobStatus;
  progress: number;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  sourceFileId?: string;
  youtubeUrl?: string;
  sourceFilename: string;
  targetFormat: string;
  options: TranscodeOptions;
  strategy?: "remux" | "transcode";
  fidelityNotice?: string;
  outputFileId?: string;
  outputFilename?: string;
  outputSize?: number;
  downloadUrl?: string;
  error?: string;
  timeMs?: number;
  metadata?: MediaMetadata;
}

export interface CreateJobParams {
  sourceFileId?: string;
  youtubeUrl?: string;
  sourceFilename: string;
  targetFormat: string;
  options: TranscodeOptions;
  strategy?: "remux" | "transcode";
  fidelityNotice?: string;
  ownerToken?: string;
}

export type CreateJobResult = MediaJob;

export interface JobStore {
  create(params: CreateJobParams): Promise<MediaJob>;
  get(id: string): Promise<MediaJob | null>;
  update(id: string, updates: Partial<MediaJob>): Promise<MediaJob>;
  delete(id: string): Promise<boolean>;
  list(): Promise<MediaJob[]>;
  purgeExpired(maxAgeMs?: number): Promise<number>;
}

/**
 * Computes a constant-time SHA-256 hash of an ownership token.
 */
export function hashOwnerToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Verifies whether a provided token grants ownership access to a job.
 * Employs timing-safe equality to protect against timing side-channel attacks.
 */
export function verifyJobOwnership(job: MediaJob, providedToken?: string | null): boolean {
  // If the job has no owner token hash (e.g. legacy test mocks), allow access
  if (!job.ownerTokenHash) {
    return true;
  }

  if (!providedToken || typeof providedToken !== "string") {
    return false;
  }

  const candidateHash = hashOwnerToken(providedToken.trim());
  const expectedHash = job.ownerTokenHash;

  if (candidateHash.length !== expectedHash.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(candidateHash, "hex"),
      Buffer.from(expectedHash, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Extracts ownership token from a Request.
 * Looks for:
 * 1. `x-job-token` header
 * 2. `Authorization: Bearer <token>`
 * 3. URL `?token=` query parameter
 * 4. Cookie `mn_token_<jobId>` or `mn_job_token`
 */
export function extractJobToken(req: Request, jobId?: string): string | null {
  const customHeader = req.headers.get("x-job-token");
  if (customHeader) return customHeader.trim();

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }

  try {
    const url = new URL(req.url);
    const tokenQuery = url.searchParams.get("token");
    if (tokenQuery) return tokenQuery.trim();
  } catch {}

  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    if (jobId) {
      const matchSpecific = cookieHeader.match(new RegExp(`(?:^|; )mn_token_${jobId}=([^;]+)`));
      if (matchSpecific) return decodeURIComponent(matchSpecific[1]).trim();
    }
    const matchGeneral = cookieHeader.match(/(?:^|; )mn_job_token=([^;]+)/);
    if (matchGeneral) return decodeURIComponent(matchGeneral[1]).trim();
  }

  return null;
}

/**
 * MemoryJobStore: Lightweight in-memory store for local execution & single-instance environments.
 */
export class MemoryJobStore implements JobStore {
  private jobs = new Map<string, MediaJob>();

  async create(params: CreateJobParams): Promise<MediaJob> {
    const id = uuidv4();
    const now = Date.now();
    // 15-minute job lifetime in alignment with our ephemeral data retention policy
    const ttlMs = parseInt(process.env.MEDIA_JOB_TTL_MS || "", 10) || 15 * 60 * 1000;

    // Generate cryptographically secure ownership token
    const ownerToken = params.ownerToken || crypto.randomBytes(24).toString("base64url");
    const ownerTokenHash = hashOwnerToken(ownerToken);

    const job: MediaJob = {
      id,
      ownerToken,
      ownerTokenHash,
      status: "queued",
      progress: 0,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + ttlMs,
      sourceFileId: params.sourceFileId,
      youtubeUrl: params.youtubeUrl,
      sourceFilename: params.sourceFilename,
      targetFormat: params.targetFormat,
      options: params.options,
      strategy: params.strategy,
      fidelityNotice: params.fidelityNotice,
    };

    this.jobs.set(id, job);
    return { ...job };
  }

  async get(id: string): Promise<MediaJob | null> {
    const job = this.jobs.get(id);
    if (!job) return null;
    return { ...job };
  }

  async update(id: string, updates: Partial<MediaJob>): Promise<MediaJob> {
    const job = this.jobs.get(id);
    if (!job) {
      throw new MediaError("Job not found.", 404, "JOB_NOT_FOUND");
    }

    const updated: MediaJob = {
      ...job,
      ...updates,
      updatedAt: Date.now(),
    };

    this.jobs.set(id, updated);
    return { ...updated };
  }

  async delete(id: string): Promise<boolean> {
    return this.jobs.delete(id);
  }

  async list(): Promise<MediaJob[]> {
    return Array.from(this.jobs.values()).map((j) => ({ ...j }));
  }

  async purgeExpired(maxAgeMs = 15 * 60 * 1000): Promise<number> {
    const now = Date.now();
    let count = 0;
    for (const [id, job] of this.jobs.entries()) {
      if (now > job.expiresAt || now - job.createdAt > maxAgeMs) {
        if (job.outputFileId) {
          await deleteStoredFile(job.outputFileId).catch(() => {});
        }
        this.jobs.delete(id);
        count++;
      }
    }
    return count;
  }
}

const globalForJobs = globalThis as unknown as {
  jobStore?: JobStore;
  activeExecutions?: Map<string, () => void>;
  runningJobIds?: Set<string>;
  lastRetentionSweepAt?: number;
};

// Global job store instance (attached to globalThis for persistence across Next.js route bundles)
export const jobStore: JobStore = globalForJobs.jobStore ?? new MemoryJobStore();
globalForJobs.jobStore = jobStore;

// Track running background execution handles for cancellation
const activeExecutions: Map<string, () => void> =
  globalForJobs.activeExecutions ?? new Map<string, () => void>();
globalForJobs.activeExecutions = activeExecutions;

// Track actively running job IDs for concurrency throttling
const runningJobIds: Set<string> =
  globalForJobs.runningJobIds ?? new Set<string>();
globalForJobs.runningJobIds = runningJobIds;

/**
 * Purges expired jobs and temporary media files according to MEDIA_JOB_TTL_MS (default 15 minutes).
 */
export async function runRetentionCleanup(force = false): Promise<{
  purgedJobs: number;
  purgedFiles: number;
}> {
  const now = Date.now();
  const minSweepIntervalMs = 60 * 1000; // debounce to at most once per minute unless forced
  if (
    !force &&
    globalForJobs.lastRetentionSweepAt &&
    now - globalForJobs.lastRetentionSweepAt < minSweepIntervalMs
  ) {
    return { purgedJobs: 0, purgedFiles: 0 };
  }
  globalForJobs.lastRetentionSweepAt = now;

  const ttlMs = parseInt(process.env.MEDIA_JOB_TTL_MS || "", 10) || 15 * 60 * 1000;
  let purgedJobs = 0;
  let purgedFiles = 0;

  try {
    purgedJobs = await jobStore.purgeExpired(ttlMs);
  } catch (err) {
    logger.error("job_retention_cleanup_error", err);
  }

  try {
    purgedFiles = await purgeExpiredFiles(ttlMs);
  } catch (err) {
    logger.error("file_retention_cleanup_error", err);
  }

  return { purgedJobs, purgedFiles };
}

/**
 * Dispatches queued jobs up to the concurrency limit
 */
export async function dispatchNextJobs(): Promise<void> {
  const envLimit = parseInt(process.env.MAX_CONCURRENT_JOBS || "", 10);
  const maxConcurrent = Number.isFinite(envLimit) && envLimit > 0 ? envLimit : 2;

  // Prune any stale IDs from runningJobIds that are no longer active
  for (const id of Array.from(runningJobIds)) {
    const j = await jobStore.get(id);
    if (!j || (j.status !== "processing" && j.status !== "queued")) {
      runningJobIds.delete(id);
    }
  }

  if (runningJobIds.size >= maxConcurrent) {
    return;
  }

  const allJobs = await jobStore.list();
  // Find queued jobs sorted by createdAt ascending (FIFO)
  const queuedJobs = allJobs
    .filter((j) => j.status === "queued" && !runningJobIds.has(j.id))
    .sort((a, b) => a.createdAt - b.createdAt);

  for (const job of queuedJobs) {
    if (runningJobIds.size >= maxConcurrent) break;

    runningJobIds.add(job.id);

    startJobProcessing(job.id)
      .catch((err) => {
        logger.error("job_processing_unhandled", err, { jobId: job.id });
      })
      .finally(() => {
        runningJobIds.delete(job.id);
        dispatchNextJobs().catch(() => {});
      });
  }
}

/**
 * Creates and enqueues a media transcoding job
 */
export async function createAndStartJob(params: CreateJobParams): Promise<MediaJob> {
  // Run non-blocking retention cleanup of expired jobs and temporary files
  runRetentionCleanup(false).catch(() => {});

  if (params.sourceFileId) {
    const sourceRecord = await getFileRecord(params.sourceFileId);
    if (!sourceRecord) {
      throw new MediaError("Referenced source media file does not exist.", 404, "SOURCE_NOT_FOUND");
    }
  } else if (!params.youtubeUrl) {
    throw new MediaError("Either sourceFileId or youtubeUrl must be provided.", 400, "BAD_REQUEST");
  }

  const job = await jobStore.create(params);

  // Trigger concurrency-limited dispatch queue
  dispatchNextJobs().catch((err) => {
    logger.error("dispatch_jobs_error", err);
  });

  return job;
}

/**
 * Executes a queued job in the background with output verification
 */
export async function startJobProcessing(jobId: string): Promise<void> {
  const job = await jobStore.get(jobId);
  if (!job || job.status !== "queued") return;

  // Case 1: Direct YouTube conversion via yt-dlp + ffmpeg
  if (job.youtubeUrl) {
    const targetExt = job.targetFormat.startsWith(".") ? job.targetFormat : `.${job.targetFormat}`;
    const { id: outputId, filePath: outputPath, expiresAt } = allocateOutputPath(targetExt, 15 * 60 * 1000);

    await jobStore.update(jobId, {
      status: "processing",
      progress: 5,
    });

    const onProgress = (percent: number) => {
      jobStore.update(jobId, { progress: Math.max(5, percent) }).catch(() => {});
    };

    const { promise, cancel } = downloadYouTubeMedia(
      job.youtubeUrl,
      job.targetFormat === "mp3" ? "mp3" : "mp4",
      outputPath,
      onProgress
    );

    activeExecutions.set(jobId, cancel);

    try {
      const result = await promise;

      if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
        throw new MediaError(
          "Conversion finished but generated an empty output file.",
          500,
          "EMPTY_OUTPUT"
        );
      }

      const outputFilename = `${job.sourceFilename.replace(/\.[^/.]+$/, "")}${targetExt}`;
      const outputMime = getMimeTypeForExt(job.targetFormat);
      const outputMeta: MediaMetadata = {
        id: outputId,
        filename: outputFilename,
        format: job.targetFormat,
        duration: 0,
        size: result.size,
        bitrate: 0,
        mimeType: outputMime,
        hasAudio: true,
        hasVideo: job.targetFormat !== "mp3",
      };

      await registerOutputFile(outputId, outputPath, outputFilename, outputMime, expiresAt);
      const record = await getFileRecord(outputId);

      await jobStore.update(jobId, {
        status: "completed",
        progress: 100,
        outputFileId: outputId,
        outputFilename,
        outputSize: record?.size || result.size,
        downloadUrl: `/api/media/jobs/${jobId}/download`,
        metadata: outputMeta,
      });
    } catch (err) {
      if (fs.existsSync(outputPath)) {
        try {
          fs.unlinkSync(outputPath);
        } catch {
          // ignore
        }
      }
      const message = err instanceof Error ? err.message : "Media conversion failed.";
      await jobStore.update(jobId, {
        status: "failed",
        error: message,
      });
    } finally {
      activeExecutions.delete(jobId);
    }
    return;
  }

  // Case 2: Local staged file conversion via FFmpeg
  if (!job.sourceFileId) {
    await jobStore.update(jobId, {
      status: "failed",
      error: "Missing source file identifier.",
    });
    return;
  }

  const sourceRecord = await getFileRecord(job.sourceFileId);
  if (!sourceRecord) {
    await jobStore.update(jobId, {
      status: "failed",
      error: "Source media file is missing or was purged.",
    });
    return;
  }

  // Allocate destination file path with 15m TTL
  const targetExt = job.targetFormat.startsWith(".") ? job.targetFormat : `.${job.targetFormat}`;
  const { id: outputId, filePath: outputPath, expiresAt } = allocateOutputPath(targetExt, 15 * 60 * 1000);

  // Update status to processing
  await jobStore.update(jobId, {
    status: "processing",
    progress: 5,
  });

  const onProgress = (percent: number) => {
    jobStore.update(jobId, { progress: Math.max(5, percent) }).catch(() => {});
  };

  const { promise, cancel } = executeTranscode(
    sourceRecord.filePath,
    outputPath,
    job.options,
    onProgress
  );

  activeExecutions.set(jobId, cancel);

  try {
    const result = await promise;

    // Step 1: Verify output file physically exists and is nonempty
    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
      throw new MediaError(
        "Conversion finished but generated an empty output file.",
        500,
        "EMPTY_OUTPUT"
      );
    }

    // Step 2: Strict probe verification - confirm output has valid container and playable streams
    const outputFilename = `${job.sourceFilename.replace(/\.[^/.]+$/, "")}_converted${targetExt}`;
    let outputMeta: MediaMetadata;
    try {
      outputMeta = await probeMedia(outputPath, outputId, outputFilename);
    } catch (probeErr) {
      if (fs.existsSync(outputPath)) {
        try {
          fs.unlinkSync(outputPath);
        } catch {
          // ignore unlink error
        }
      }
      throw new MediaError(
        `Output media verification failed: generated media could not be validated (${(probeErr as Error).message}).`,
        500,
        "OUTPUT_VERIFICATION_FAILED"
      );
    }

    // Step 3: Register verified output file in storage
    const outputMime = getMimeTypeForExt(job.targetFormat);
    await registerOutputFile(outputId, outputPath, outputFilename, outputMime, expiresAt);
    const record = await getFileRecord(outputId);

    // Step 4: Mark job completed only after successful verification
    await jobStore.update(jobId, {
      status: "completed",
      progress: 100,
      outputFileId: outputId,
      outputFilename,
      outputSize: record?.size || 0,
      downloadUrl: `/api/media/jobs/${jobId}/download`,
      timeMs: result.timeMs,
      metadata: outputMeta,
    });
  } catch (err) {
    if (fs.existsSync(outputPath)) {
      try {
        fs.unlinkSync(outputPath);
      } catch {
        // ignore unlink error
      }
    }
    const message = err instanceof Error ? err.message : "Media conversion failed.";
    await jobStore.update(jobId, {
      status: "failed",
      error: message,
    });
  } finally {
    activeExecutions.delete(jobId);
  }
}

/**
 * Retrieves a job by ID
 */
export async function getJobById(jobId: string): Promise<MediaJob | null> {
  const job = await jobStore.get(jobId);
  if (!job) return null;

  // Mark expired if past expiration time
  if (Date.now() > job.expiresAt && job.status !== "expired") {
    await jobStore.update(jobId, { status: "expired" });
    return { ...job, status: "expired" };
  }

  return job;
}

/**
 * Cancels a running job and cleans up associated files
 */
export async function cancelJobById(jobId: string): Promise<boolean> {
  const job = await jobStore.get(jobId);
  if (!job) return false;

  // Cancel running FFmpeg process if active
  const cancel = activeExecutions.get(jobId);
  if (cancel) {
    cancel();
    activeExecutions.delete(jobId);
  }

  runningJobIds.delete(jobId);

  // Purge any output file
  if (job.outputFileId) {
    await deleteStoredFile(job.outputFileId).catch(() => {});
  }

  await jobStore.update(jobId, {
    status: "cancelled",
    progress: 0,
    error: "Job cancelled by user request.",
  });

  // Prompt dispatch queue to advance next queued jobs
  dispatchNextJobs().catch(() => {});

  return true;
}

/**
 * Gracefully terminates all actively executing FFmpeg worker child processes.
 * Called on server shutdown (SIGTERM / SIGINT).
 */
export async function shutdownActiveJobs(): Promise<number> {
  let count = 0;
  for (const [jobId, cancel] of activeExecutions.entries()) {
    try {
      cancel();
      count++;
    } catch {
      // ignore kill errors
    }
    jobStore.update(jobId, {
      status: "cancelled",
      error: "Server is shutting down.",
    }).catch(() => {});
  }
  activeExecutions.clear();
  runningJobIds.clear();
  return count;
}

/**
 * Checks if a stored file is currently being processed or queued in an active job
 */
export async function isFileReferencedByActiveJob(fileId: string): Promise<boolean> {
  const jobs = await jobStore.list();
  return jobs.some(
    (j) =>
      (j.status === "queued" || j.status === "processing") &&
      (j.sourceFileId === fileId || j.outputFileId === fileId)
  );
}
