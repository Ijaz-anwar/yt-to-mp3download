import { MediaMetadata } from "@/lib/validation/schemas";
import { MediaCapabilities } from "@/lib/services/format-capabilities";
import { MediaJob, JobStatus } from "@/lib/services/job-manager";

export interface ApiErrorPayload {
  message?: string;
  code?: string;
  statusCode?: number;
  details?: unknown;
}

export class ApiClientError extends Error {
  code?: string;
  statusCode?: number;
  details?: unknown;

  constructor(message: string, code?: string, statusCode?: number, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export interface UploadProgressEvent {
  loaded: number;
  total: number;
  percent: number;
}

export interface UploadResponse {
  success: boolean;
  fileId: string;
  record: {
    id: string;
    filename: string;
    size: number;
    mimeType: string;
  };
  metadata: MediaMetadata;
  capabilities: MediaCapabilities;
}

export interface AnalyzeResponse {
  success: boolean;
  sourceType: "upload" | "url" | "youtube";
  fileId?: string;
  directUrl?: string;
  youtubeUrl?: string;
  youtubeInfo?: {
    title: string;
    thumbnail: string;
    duration: number;
    uploader: string;
  };
  metadata: MediaMetadata;
  capabilities: MediaCapabilities;
}

export interface CreateJobRequest {
  fileId?: string;
  youtubeUrl?: string;
  targetFormat: string;
  audioBitrate?: "128k" | "192k" | "256k" | "320k";
  audioSampleRate?: 44100 | 48000;
  videoResolution?: "original" | "1080p" | "720p" | "480p";
  trimStart?: number;
  trimEnd?: number;
  stripAudio?: boolean;
  stripVideo?: boolean;
  volume?: number;
}

export interface CreateJobResponse {
  success: boolean;
  job: {
    id: string;
    status: JobStatus;
    progress: number;
    createdAt: number;
    targetFormat: string;
    sourceFilename: string;
    strategy?: "remux" | "transcode";
    fidelityNotice?: string;
  };
  ownerToken?: string;
}

export interface GetJobResponse {
  success: boolean;
  job: MediaJob;
}

export interface CancelJobResponse {
  success: boolean;
  message: string;
}

/**
 * Normalizes raw server responses or network errors into clear, actionable human messages
 */
export function normalizeActionableError(err: unknown): ApiClientError {
  if (err instanceof ApiClientError) {
    return err;
  }

  if (err instanceof DOMException && err.name === "AbortError") {
    return new ApiClientError("Request was cancelled by user.", "ABORTED", 499);
  }

  const rawMessage = err instanceof Error ? err.message : String(err);

  // Connection failures
  if (
    rawMessage.includes("Failed to fetch") ||
    rawMessage.includes("NetworkError") ||
    rawMessage.includes("ECONNREFUSED")
  ) {
    return new ApiClientError(
      "Unable to connect to the MediaNest processing server. Please check your internet connection.",
      "NETWORK_ERROR",
      0
    );
  }

  return new ApiClientError(rawMessage || "An unexpected error occurred during processing.");
}

/**
 * Parses JSON response safely and extracts structured API errors
 */
async function parseResponseOrThrow<T>(res: Response): Promise<T> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new ApiClientError(
      `Server returned an unreadable response (${res.status} ${res.statusText}).`,
      "MALFORMED_RESPONSE",
      res.status
    );
  }

  if (!res.ok) {
    const errorObj = (body as { error?: ApiErrorPayload | string })?.error;
    let message = "Request failed.";
    let code: string | undefined;

    if (typeof errorObj === "string") {
      message = errorObj;
    } else if (errorObj && typeof errorObj === "object") {
      message = errorObj.message || message;
      code = errorObj.code;
    }

    throw new ApiClientError(message, code, res.status, body);
  }

  return body as T;
}

/**
 * Client-side secure storage for job ownership tokens within user session
 */
const jobTokens = new Map<string, string>();

export function setJobToken(jobId: string, token: string): void {
  jobTokens.set(jobId, token);
}

export function getJobToken(jobId: string): string | undefined {
  return jobTokens.get(jobId);
}

export function clearJobToken(jobId: string): void {
  jobTokens.delete(jobId);
}

/**
 * Reusable MediaNest API Client
 */
export const mediaApiClient = {
  /**
   * Uploads a local file with real client-side progress measurement via XMLHttpRequest
   */
  async uploadFile(
    file: File,
    options?: {
      onProgress?: (progress: UploadProgressEvent) => void;
      signal?: AbortSignal;
    }
  ): Promise<UploadResponse> {
    if (file.size === 0) {
      throw new ApiClientError(
        "The selected file is empty (0 bytes). Please choose a valid media file.",
        "EMPTY_FILE",
        400
      );
    }

    // Check size limit: 250 MB
    const maxBytes = 250 * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new ApiClientError(
        `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed upload limit of 250 MB.`,
        "FILE_TOO_LARGE",
        413
      );
    }

    const formData = new FormData();
    formData.append("file", file);

    // If XMLHttpRequest is available (browser runtime), use it for real upload progress
    if (typeof XMLHttpRequest !== "undefined") {
      return new Promise<UploadResponse>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/media/upload");

        if (options?.signal) {
          options.signal.addEventListener("abort", () => {
            xhr.abort();
            reject(new ApiClientError("Upload was cancelled.", "ABORTED", 499));
          });
        }

        if (xhr.upload && options?.onProgress) {
          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable) {
              const percent = Math.min(100, Math.round((evt.loaded / evt.total) * 100));
              options.onProgress?.({
                loaded: evt.loaded,
                total: evt.total,
                percent,
              });
            }
          };
        }

        xhr.onload = () => {
          let parsed: unknown;
          try {
            parsed = JSON.parse(xhr.responseText);
          } catch {
            return reject(
              new ApiClientError(
                `Server returned an unreadable response (${xhr.status}).`,
                "MALFORMED_RESPONSE",
                xhr.status
              )
            );
          }

          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(parsed as UploadResponse);
          } else {
            const errObj = (parsed as { error?: ApiErrorPayload | string })?.error;
            const message =
              typeof errObj === "string"
                ? errObj
                : errObj?.message || `Upload failed with status code ${xhr.status}.`;
            const code = typeof errObj === "object" ? errObj?.code : undefined;
            reject(new ApiClientError(message, code, xhr.status, parsed));
          }
        };

        xhr.onerror = () => {
          reject(
            new ApiClientError(
              "Network error occurred while uploading media. Please check your connection.",
              "NETWORK_ERROR",
              0
            )
          );
        };

        xhr.send(formData);
      });
    }

    // Fallback to fetch (e.g. Node.js or synthetic environments)
    try {
      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
        signal: options?.signal,
      });

      return await parseResponseOrThrow<UploadResponse>(res);
    } catch (err) {
      throw normalizeActionableError(err);
    }
  },

  /**
   * Probes and analyzes an authorized remote media URL
   */
  async analyzeUrl(url: string, signal?: AbortSignal): Promise<AnalyzeResponse> {
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      throw new ApiClientError("Please provide a valid media URL.", "EMPTY_URL", 400);
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(cleanUrl);
    } catch {
      throw new ApiClientError(
        "Malformed media URL. Please ensure it starts with http:// or https://.",
        "INVALID_URL",
        400
      );
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new ApiClientError(
        "Only HTTP and HTTPS media URLs are supported.",
        "INVALID_SCHEME",
        400
      );
    }

    try {
      const res = await fetch("/api/media/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanUrl }),
        signal,
      });

      return await parseResponseOrThrow<AnalyzeResponse>(res);
    } catch (err) {
      throw normalizeActionableError(err);
    }
  },

  /**
   * Analyzes an already uploaded file by fileId
   */
  async analyzeFile(fileId: string, signal?: AbortSignal): Promise<AnalyzeResponse> {
    try {
      const res = await fetch("/api/media/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
        signal,
      });

      return await parseResponseOrThrow<AnalyzeResponse>(res);
    } catch (err) {
      throw normalizeActionableError(err);
    }
  },

  /**
   * Generates a test sample file (audio or video) for local testing
   */
  async generateSample(
    type: "audio" | "video",
    signal?: AbortSignal
  ): Promise<{ success: boolean; fileId: string; metadata: MediaMetadata; capabilities: MediaCapabilities }> {
    try {
      const res = await fetch("/api/media/sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
        signal,
      });

      const data = await parseResponseOrThrow<{
        success: boolean;
        fileId?: string;
        record: { id: string };
        metadata: MediaMetadata;
        capabilities?: MediaCapabilities;
      }>(res);

      const targetId = data.fileId || data.record.id;
      let capabilities = data.capabilities;
      let metadata = data.metadata;

      // Fallback only if server did not include capabilities
      if (!capabilities) {
        const analyzeData = await this.analyzeFile(targetId, signal);
        capabilities = analyzeData.capabilities;
        metadata = analyzeData.metadata;
      }

      return {
        success: true,
        fileId: targetId,
        metadata,
        capabilities,
      };
    } catch (err) {
      throw normalizeActionableError(err);
    }
  },

  /**
   * Submits a media conversion job to the asynchronous worker queue
   */
  async createJob(params: CreateJobRequest, signal?: AbortSignal): Promise<CreateJobResponse> {
    try {
      const res = await fetch("/api/media/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
        signal,
      });

      const response = await parseResponseOrThrow<CreateJobResponse>(res);
      if (response.ownerToken && response.job?.id) {
        setJobToken(response.job.id, response.ownerToken);
      }
      return response;
    } catch (err) {
      throw normalizeActionableError(err);
    }
  },

  /**
   * Polls the real status and progress of a conversion job
   */
  async getJob(jobId: string, signal?: AbortSignal): Promise<GetJobResponse> {
    try {
      const token = getJobToken(jobId);
      const headers: Record<string, string> = { Accept: "application/json" };
      if (token) {
        headers["x-job-token"] = token;
      }

      const res = await fetch(`/api/media/jobs/${encodeURIComponent(jobId)}`, {
        method: "GET",
        headers,
        signal,
      });

      return await parseResponseOrThrow<GetJobResponse>(res);
    } catch (err) {
      throw normalizeActionableError(err);
    }
  },

  /**
   * Cancels a running or queued job and cleans up associated files
   */
  async cancelJob(jobId: string, signal?: AbortSignal): Promise<CancelJobResponse> {
    try {
      const token = getJobToken(jobId);
      const headers: Record<string, string> = { Accept: "application/json" };
      if (token) {
        headers["x-job-token"] = token;
      }

      const res = await fetch(`/api/media/jobs/${encodeURIComponent(jobId)}`, {
        method: "DELETE",
        headers,
        signal,
      });

      const parsed = await parseResponseOrThrow<CancelJobResponse>(res);
      clearJobToken(jobId);
      return parsed;
    } catch (err) {
      throw normalizeActionableError(err);
    }
  },

  /**
   * Returns the verified download URL for a completed job, appending the ownership token if available
   */
  getDownloadUrl(jobId: string): string {
    const base = `/api/media/jobs/${encodeURIComponent(jobId)}/download`;
    const token = getJobToken(jobId);
    return token ? `${base}?token=${encodeURIComponent(token)}` : base;
  },
};
