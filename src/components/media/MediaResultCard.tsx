"use client";

import React, { useState } from "react";
import {
  Download,
  Film,
  Music2,
  Play,
  CheckCircle2,
  RefreshCw,
  Clock,
  HardDrive,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Alert } from "@/components/ui/Alert";
import { formatBytes, formatDuration } from "@/lib/utils/format";
import { MediaMetadata } from "@/lib/validation/schemas";
import { SITE_CONFIG } from "@/config/site";

export interface MediaResultCardProps {
  sourceMetadata: MediaMetadata;
  sourceType: "upload" | "url";
  directUrl?: string;
  onReset?: () => void;
}

export function MediaResultCard({
  sourceMetadata,
  sourceType,
  directUrl,
  onReset,
}: MediaResultCardProps) {
  const isVideoSource = sourceMetadata.hasVideo;

  // Active mode & formats
  const [activeMediaTab, setActiveMediaTab] = useState<"video" | "audio">(
    isVideoSource ? "video" : "audio"
  );
  const [selectedFormat, setSelectedFormat] = useState<string>(
    isVideoSource ? "mp4" : "mp3"
  );
  const [videoQuality, setVideoQuality] = useState<string>("original");
  const [audioBitrate, setAudioBitrate] = useState<"128k" | "192k" | "256k" | "320k">("192k");

  // Conversion process state
  const [status, setStatus] = useState<"idle" | "converting" | "completed" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadInfo, setDownloadInfo] = useState<{
    id: string;
    downloadUrl: string;
    previewUrl: string;
    filename: string;
    size: number;
    timeMs: number;
    metadata: MediaMetadata;
  } | null>(null);

  // Available format definitions
  const videoFormats = [
    { id: "mp4", label: "MP4 Video", ext: ".mp4", supported: isVideoSource },
    { id: "webm", label: "WebM Video", ext: ".webm", supported: isVideoSource },
  ];

  const audioFormats = [
    { id: "mp3", label: "MP3 Audio", ext: ".mp3", supported: true },
    { id: "m4a", label: "M4A Audio", ext: ".m4a", supported: true },
    { id: "wav", label: "WAV Lossless", ext: ".wav", supported: true },
    { id: "flac", label: "FLAC Master", ext: ".flac", supported: true },
  ];

  const handleTabSwitch = (tab: "video" | "audio") => {
    setActiveMediaTab(tab);
    if (tab === "video") {
      setSelectedFormat("mp4");
    } else {
      setSelectedFormat("mp3");
    }
  };

  const handleConvert = async () => {
    setStatus("converting");
    setStatusMessage("Transcoding media pipeline with native FFmpeg...");
    setErrorMessage(null);
    setDownloadInfo(null);

    try {
      const payload: Record<string, unknown> = {
        targetFormat: selectedFormat,
      };

      if (sourceMetadata.id) {
        payload.fileId = sourceMetadata.id;
      } else if (directUrl) {
        payload.directUrl = directUrl;
      }

      if (activeMediaTab === "audio" || ["mp3", "m4a", "wav", "flac"].includes(selectedFormat)) {
        payload.audioBitrate = audioBitrate;
        payload.stripVideo = true;
      } else {
        payload.videoResolution = videoQuality;
      }

      const res = await fetch("/api/media/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Transcoding failed on the server.");
      }

      setDownloadInfo({
        id: data.result.id,
        downloadUrl: data.downloadUrl,
        previewUrl: data.previewUrl,
        filename: data.result.filename,
        size: data.result.size,
        timeMs: data.result.timeMs,
        metadata: data.result.metadata,
      });
      setStatus("completed");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Media conversion failed. Please try another preset."
      );
    }
  };

  return (
    <div className="w-full rounded-2xl border border-slate-200/90 bg-white shadow-md shadow-slate-100 overflow-hidden transition-all">
      {/* Top Header / Status bar */}
      <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant={sourceType === "upload" ? "primary" : "neutral"} size="sm">
            {sourceType === "upload" ? "Local Media File" : "Verified Direct Stream"}
          </Badge>
          <span className="text-xs text-slate-500 font-medium">
            Format: <strong className="text-slate-800 uppercase">{sourceMetadata.format}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {status === "completed" ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Ready for Download
            </span>
          ) : status === "converting" ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200/80 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Transcoding...
            </span>
          ) : (
            <span className="text-xs font-semibold text-slate-500">
              Analysis Verified
            </span>
          )}

          {onReset && (
            <button
              onClick={onReset}
              type="button"
              className="text-xs font-semibold text-slate-400 hover:text-slate-700 underline px-2 py-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Media Details Banner */}
      <div className="p-5 sm:p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center border-b border-slate-100">
        {/* Actual Thumbnail or Fallback Icon */}
        <div className="relative h-24 w-36 sm:h-28 sm:w-44 shrink-0 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center text-white border border-slate-200 shadow-inner">
          {sourceMetadata.thumbnailUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={sourceMetadata.thumbnailUrl}
              alt="Media thumbnail"
              className="h-full w-full object-cover"
            />
          ) : isVideoSource ? (
            <div className="flex flex-col items-center gap-1.5 text-slate-400">
              <Film className="w-8 h-8 text-indigo-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Video Frame</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-slate-400">
              <Music2 className="w-8 h-8 text-violet-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Audio Wave</span>
            </div>
          )}

          {sourceMetadata.duration ? (
            <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-white tracking-wide">
              {formatDuration(sourceMetadata.duration)}
            </span>
          ) : null}
        </div>

        {/* Media Metadata Info */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <h3
            className="text-base sm:text-lg font-black text-slate-900 truncate"
            title={sourceMetadata.filename}
          >
            {sourceMetadata.filename}
          </h3>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-slate-400" />
              {formatBytes(sourceMetadata.size)}
            </span>

            {sourceMetadata.duration ? (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {formatDuration(sourceMetadata.duration)}
              </span>
            ) : null}

            {sourceMetadata.videoWidth && sourceMetadata.videoHeight ? (
              <span className="flex items-center gap-1">
                <Film className="w-3.5 h-3.5 text-slate-400" />
                {sourceMetadata.videoWidth}×{sourceMetadata.videoHeight}{" "}
                {sourceMetadata.videoFps ? `(${sourceMetadata.videoFps} fps)` : ""}
              </span>
            ) : null}

            {sourceMetadata.audioCodec ? (
              <span className="flex items-center gap-1">
                <Music2 className="w-3.5 h-3.5 text-slate-400" />
                {sourceMetadata.audioCodec.toUpperCase()}{" "}
                {sourceMetadata.audioSampleRate ? `${sourceMetadata.audioSampleRate / 1000}kHz` : ""}
              </span>
            ) : null}
          </div>

          <p className="text-[11px] text-slate-400 truncate">
            Source: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">{sourceMetadata.filename}</code>
          </p>
        </div>
      </div>

      {/* Target Media Options Area */}
      <div className="p-5 sm:p-6 bg-slate-50/40 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              1. Choose Media Format
            </h4>
            {!isVideoSource && (
              <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Audio-only input: Video options disabled
              </span>
            )}
          </div>

          {/* Video / Audio Category Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <button
              type="button"
              onClick={() => handleTabSwitch("video")}
              disabled={!isVideoSource}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeMediaTab === "video"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : isVideoSource
                  ? "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Video Formats</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabSwitch("audio")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeMediaTab === "audio"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Music2 className="w-3.5 h-3.5" />
              <span>Audio Formats</span>
            </button>
          </div>

          {/* Format Radio Choices */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {activeMediaTab === "video"
              ? videoFormats.map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    disabled={!fmt.supported}
                    onClick={() => setSelectedFormat(fmt.id)}
                    className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                      selectedFormat === fmt.id
                        ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/10"
                        : fmt.supported
                        ? "border-slate-200 bg-white hover:border-slate-300"
                        : "border-slate-200 bg-slate-100/70 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <span className="font-bold text-xs text-slate-900">{fmt.label}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{fmt.ext}</span>
                  </button>
                ))
              : audioFormats.map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setSelectedFormat(fmt.id)}
                    className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                      selectedFormat === fmt.id
                        ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/10"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span className="font-bold text-xs text-slate-900">{fmt.label}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{fmt.ext}</span>
                  </button>
                ))}
          </div>
        </div>

        {/* Quality / Bitrate Selector */}
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
            2. Configure Fidelity & Encoding
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeMediaTab === "video" ? (
              <Select
                label="Video Resolution"
                value={videoQuality}
                onChange={(e) => setVideoQuality(e.target.value)}
                options={SITE_CONFIG.resolutionPresets}
                helperText="Downscale or maintain original resolution"
              />
            ) : (
              <Select
                label="Audio Bitrate"
                value={audioBitrate}
                onChange={(e) =>
                  setAudioBitrate(e.target.value as "128k" | "192k" | "256k" | "320k")
                }
                options={SITE_CONFIG.bitratePresets}
                helperText="Select output compression bitrate"
              />
            )}
          </div>
        </div>

        {/* Action Trigger */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200/70">
          <span className="text-xs text-slate-500">
            Target Output: <strong className="text-slate-800 uppercase">{selectedFormat}</strong>{" "}
            ({activeMediaTab === "video" ? videoQuality : audioBitrate})
          </span>

          <Button
            variant="primary"
            size="lg"
            onClick={handleConvert}
            isLoading={status === "converting"}
            disabled={status === "converting"}
            leftIcon={<Play className="w-4 h-4 fill-white" />}
          >
            {status === "converting"
              ? "Transcoding Media..."
              : `Convert to ${selectedFormat.toUpperCase()}`}
          </Button>
        </div>

        {status === "converting" && (
          <ProgressBar indeterminate label={statusMessage} />
        )}

        {status === "error" && errorMessage && (
          <Alert variant="error" title="Conversion Failed" onDismiss={() => setErrorMessage(null)}>
            {errorMessage}
          </Alert>
        )}
      </div>

      {/* Completed Download & Preview View */}
      {status === "completed" && downloadInfo && (
        <div className="p-5 sm:p-6 border-t border-emerald-100 bg-emerald-50/20 space-y-5 animate-in fade-in duration-300">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Transcoding Finished Successfully
              </h4>
              <p className="text-xs text-slate-500">
                Processed in {(downloadInfo.timeMs / 1000).toFixed(2)}s • Output size:{" "}
                <strong>{formatBytes(downloadInfo.size)}</strong>
              </p>
            </div>

            <a href={downloadInfo.downloadUrl} download={downloadInfo.filename}>
              <Button
                variant="primary"
                size="md"
                leftIcon={<Download className="w-4 h-4" />}
                className="bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
              >
                Download {downloadInfo.filename} ({formatBytes(downloadInfo.size)})
              </Button>
            </a>
          </div>

          {/* In-Browser Preview Player */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <span className="text-xs font-bold text-slate-700 mb-2 block">
              In-Browser Preview:
            </span>
            {activeMediaTab === "video" ? (
              <video
                controls
                preload="metadata"
                src={downloadInfo.previewUrl}
                className="w-full max-h-[340px] rounded-lg bg-black object-contain"
              >
                Your browser does not support HTML5 video preview.
              </video>
            ) : (
              <audio
                controls
                preload="metadata"
                src={downloadInfo.previewUrl}
                className="w-full rounded-lg"
              >
                Your browser does not support HTML5 audio playback.
              </audio>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
