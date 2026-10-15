"use client";

import React, { useState } from "react";
import { Copy, Check, Layers } from "lucide-react";
import { MediaMetadata } from "@/lib/validation/schemas";
import { formatBytes, formatDuration, formatBitrate } from "@/lib/utils/format";
import { Button } from "@/components/ui/Button";

export interface MetadataInspectorCardProps {
  metadata: MediaMetadata;
}

export function MetadataInspectorCard({ metadata }: MetadataInspectorCardProps) {
  const [copied, setCopied] = useState(false);

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(metadata, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Media Analysis & Metadata</h4>
            <p className="text-xs text-slate-500">Verified stream parameters via FFprobe</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={copyJson}
          leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        >
          {copied ? "Copied JSON" : "Copy Specs"}
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
        <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
          <span className="text-slate-400 font-medium block mb-1">Container</span>
          <span className="font-bold text-slate-800 uppercase">{metadata.format || "N/A"}</span>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
          <span className="text-slate-400 font-medium block mb-1">File Size</span>
          <span className="font-bold text-slate-800">{formatBytes(metadata.size)}</span>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
          <span className="text-slate-400 font-medium block mb-1">Duration</span>
          <span className="font-bold text-slate-800">
            {metadata.duration ? formatDuration(metadata.duration) : "Unknown"}
          </span>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
          <span className="text-slate-400 font-medium block mb-1">Bitrate</span>
          <span className="font-bold text-slate-800">{formatBitrate(metadata.bitrate)}</span>
        </div>

        {metadata.hasVideo && (
          <>
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <span className="text-slate-400 font-medium block mb-1">Video Codec</span>
              <span className="font-bold text-indigo-600 uppercase">
                {metadata.videoCodec || "N/A"}
              </span>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <span className="text-slate-400 font-medium block mb-1">Resolution</span>
              <span className="font-bold text-slate-800">
                {metadata.videoWidth && metadata.videoHeight
                  ? `${metadata.videoWidth} × ${metadata.videoHeight}`
                  : "N/A"}
              </span>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <span className="text-slate-400 font-medium block mb-1">Frame Rate</span>
              <span className="font-bold text-slate-800">
                {metadata.videoFps ? `${metadata.videoFps} fps` : "N/A"}
              </span>
            </div>
          </>
        )}

        {metadata.hasAudio && (
          <>
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <span className="text-slate-400 font-medium block mb-1">Audio Codec</span>
              <span className="font-bold text-indigo-600 uppercase">
                {metadata.audioCodec || "N/A"}
              </span>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <span className="text-slate-400 font-medium block mb-1">Sample Rate</span>
              <span className="font-bold text-slate-800">
                {metadata.audioSampleRate ? `${metadata.audioSampleRate / 1000} kHz` : "N/A"}
              </span>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <span className="text-slate-400 font-medium block mb-1">Channels</span>
              <span className="font-bold text-slate-800">
                {metadata.audioChannels === 2
                  ? "Stereo (2ch)"
                  : metadata.audioChannels === 1
                  ? "Mono (1ch)"
                  : metadata.audioChannels
                  ? `${metadata.audioChannels} channels`
                  : "N/A"}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
