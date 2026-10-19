import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

export class MediaError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode = 400,
    code = "BAD_REQUEST",
    details?: unknown
  ) {
    super(message);
    this.name = "MediaError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Structured operational logger (does not log sensitive media content or secrets)
 */
export const logger = {
  info: (action: string, meta?: Record<string, unknown>) => {
    console.log(
      JSON.stringify({
        level: "INFO",
        timestamp: new Date().toISOString(),
        action,
        ...meta,
      })
    );
  },
  warn: (action: string, meta?: Record<string, unknown>) => {
    console.warn(
      JSON.stringify({
        level: "WARN",
        timestamp: new Date().toISOString(),
        action,
        ...meta,
      })
    );
  },
  error: (action: string, error: unknown, meta?: Record<string, unknown>) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        level: "ERROR",
        timestamp: new Date().toISOString(),
        action,
        message: sanitizeErrorMessage(message),
        ...meta,
      })
    );
  },
};

/**
 * Strip server paths from error strings to prevent leaking host filesystem structure
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message) return "An unexpected error occurred.";
  const cwd = process.cwd().replace(/\\/g, "\\\\");
  const regex = new RegExp(cwd, "gi");
  return message
    .replace(regex, "[workspace]")
    .replace(/[a-zA-Z]:\\[^:\n\r\t]+/g, "[internal-path]")
    .replace(/(\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b)/g, "[redacted-ip]")
    .slice(0, 500);
}

/**
 * Safely parses request JSON with a hard byte-size ceiling to protect against memory exhaustion.
 */
export async function parseJsonBodyWithLimit<T>(
  req: NextRequest,
  maxBytes = 64 * 1024 // 64 KB limit for JSON payloads
): Promise<T> {
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    throw new MediaError(
      `Request body exceeds the maximum permitted size of ${Math.round(maxBytes / 1024)} KB.`,
      413,
      "PAYLOAD_TOO_LARGE"
    );
  }

  const rawText = await req.text();
  if (Buffer.byteLength(rawText, "utf8") > maxBytes) {
    throw new MediaError(
      `Request payload exceeds maximum permitted size of ${Math.round(maxBytes / 1024)} KB.`,
      413,
      "PAYLOAD_TOO_LARGE"
    );
  }

  if (!rawText.trim()) {
    throw new MediaError("Request body cannot be empty.", 400, "EMPTY_BODY");
  }

  try {
    return JSON.parse(rawText) as T;
  } catch {
    throw new MediaError("Invalid JSON payload.", 400, "INVALID_JSON");
  }
}

/**
 * Convert any server error into a standardized JSON response with safe headers
 */
export function handleApiError(
  error: unknown,
  extraHeaders?: HeadersInit
): NextResponse<ErrorResponse> {
  const headers = new Headers(extraHeaders);

  if (error instanceof MediaError) {
    logger.warn("media_operation_error", {
      code: error.code,
      statusCode: error.statusCode,
      message: error.message,
    });

    if (error.statusCode === 429) {
      const details = error.details as { retryAfter?: number } | undefined;
      if (details?.retryAfter && !headers.has("Retry-After")) {
        headers.set("Retry-After", details.retryAfter.toString());
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      {
        status: error.statusCode,
        headers,
      }
    );
  }

  if (error instanceof ZodError) {
    const formatted = error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    logger.warn("validation_error", { issues: formatted });
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_FAILED",
          message: error.issues[0]?.message || "Invalid request payload.",
          details: formatted,
        },
      },
      {
        status: 400,
        headers,
      }
    );
  }

  const rawMessage = error instanceof Error ? error.message : "Internal media engine error.";
  const safeMessage = sanitizeErrorMessage(rawMessage);

  logger.error("internal_api_error", error);

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: safeMessage,
      },
    },
    {
      status: 500,
      headers,
    }
  );
}
