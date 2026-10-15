"use client";

import React from "react";
import { Download, Film, Music2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatBytes, formatDuration } from "@/lib/utils/format";
import { MediaMetadata } from "@/lib/validation/schemas";

export interface MediaPreviewProps {
  id: string;
  downloadUrl: string;
  previewUrl: string;
  filename: string;
  size: number;
  metadata?: MediaMetadata;
  targetFormat?: string;
}

export function MediaPreview({
  downloadUrl,
  previewUrl,
  filename,
  size,
  metadata,
  targetFormat,
}: MediaPreviewProps) {
  const isVideo =
    metadata?.hasVideo ||
    ["mp4", "webm", "mkv", "mov"].includes(
      targetFormat?.toLowerCase() || ""
    );

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            {isVideo ? <Film className="w-4 h-4" /> : <Music2 className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <h4 className="truncate text-sm font-bold text-slate-900" title={filename}>
              {filename}
            </h4>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{formatBytes(size)}</span>
              {metadata?.duration ? (
                <>
                  <span>•</span>
                  <span>{formatDuration(metadata.duration)}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {targetFormat && (
            <Badge variant="primary" size="sm">
              {targetFormat.toUpperCase()}
            </Badge>
          )}
          {metadata?.videoHeight ? (
            <Badge variant="neutral" size="sm">
              {metadata.videoHeight}p
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Media Playback View */}
      <div className="p-4 sm:p-6 bg-slate-900/5 flex flex-col items-center justify-center">
        {isVideo ? (
          <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-black shadow-inner">
            <video
              controls
              playsInline
              preload="metadata"
              src={previewUrl}
              className="w-full max-h-[380px] object-contain"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        ) : (
          <div className="w-full max-w-lg py-4 flex flex-col items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100/80 text-indigo-600 shadow-sm animate-pulse">
              <Music2 className="w-8 h-8" />
            </div>
            <audio
              controls
              preload="metadata"
              src={previewUrl}
              className="w-full rounded-lg"
            >
              Your browser does not support the audio element.
            </audio>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 bg-white border-t border-slate-100">
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Open Direct Link</span>
        </a>

        <a href={downloadUrl} download={filename}>
          <Button variant="primary" size="md" leftIcon={<Download className="w-4 h-4" />}>
            Download Ready File ({formatBytes(size)})
          </Button>
        </a>
      </div>
    </div>
  );
}
