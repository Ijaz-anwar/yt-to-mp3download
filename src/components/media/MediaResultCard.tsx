"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Download,
  Film,
  Music2,
  Play,
  CheckCircle2,
  RefreshCw,
  Clock,
  HardDrive,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Alert } from "@/components/ui/Alert";
import { formatBytes, formatDuration } from "@/lib/utils/format";
import { MediaMetadata } from "@/lib/validation/schemas";
import { MediaCapabilities } from "@/lib/services/format-capabilities";
import { SITE_CONFIG } from "@/config/site";
import {
  mediaApiClient,
  ApiClientError,
  normalizeActionableError,
} from "@/lib/api/media-client";

export type CardStatus =
  | "ready"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelling"
  | "expired";

export interface MediaResultCardProps {
  sourceMetadata: MediaMetadata;
  sourceType: "upload" | "url";
  directUrl?: string;
  fileId?: string;
  capabilities?: MediaCapabilities;
  onReset?: () => void;
}

export function MediaResultCard({
  sourceMetadata,
  sourceType,
  fileId,
  capabilities,
  onReset,
}: MediaResultCardProps) {
  const isVideoSource = Boolean(sourceMetadata.hasVideo);

  // Active mode & formats
  const [activeMediaTab, setActiveMediaTab] = useState<"video" | "audio">(
    isVideoSource ? "video" : "audio"
  );
  const [selectedFormat, setSelectedFormat] = useState<string>(
    isVideoSource ? "mp4" : "mp3"
  );
  const [videoQuality, setVideoQuality] = useState<string>("original");
  const [audioBitrate, setAudioBitrate] = useState<"128k" | "192k" | "256k" | "320k">("192k");

  // Lifecycle & conversion state machine
  const [cardStatus, setCardStatus] = useState<CardStatus>("ready");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<number>(0);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<"remux" | "transcode" | null>(null);
  const [fidelityNotice, setFidelityNotice] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const createdObjectUrlsRef = useRef<Set<string>>(new Set());

  const [downloadInfo, setDownloadInfo] = useState<{
    id: string;
    downloadUrl: string;
    previewUrl: string;
    filename: string;
    size: number;
    timeMs: number;
    metadata: MediaMetadata;
  } | null>(null);

  // Cleanup polling, abort controller, and temporary object URLs on unmount
  useEffect(() => {
    const urlsToRevoke = createdObjectUrlsRef.current;
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      urlsToRevoke.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      });
      urlsToRevoke.clear();
    };
  }, []);

  // Filter video resolution presets based strictly on capabilities
  const allowedResolutions = capabilities?.availableResolutions || ["original", "1080p", "720p", "480p"];
  const availableResolutionOptions = SITE_CONFIG.resolutionPresets.filter((preset) =>
    allowedResolutions.includes(preset.value)
  );

  // Selectable video quality fallback during render without setState in effect
  const effectiveVideoQuality = availableResolutionOptions.some((opt) => opt.value === videoQuality)
    ? videoQuality
    : (availableResolutionOptions[0]?.value || "original");

  // Video formats available from capabilities
  const supportedVideoIds = (!isVideoSource)
    ? []
    : (capabilities?.availableVideoFormats && capabilities.availableVideoFormats.length > 0)
    ? capabilities.availableVideoFormats.map((f) => f.id)
    : ["mp4", "webm"];

  const videoFormats = [
    {
      id: "mp4",
      label: "MP4 Video",
      ext: ".mp4",
      supported: isVideoSource && supportedVideoIds.includes("mp4"),
    },
    {
      id: "webm",
      label: "WebM Video",
      ext: ".webm",
      supported: isVideoSource && supportedVideoIds.includes("webm"),
    },
  ];

  // Audio formats available from capabilities
  const supportedAudioIds = (capabilities?.availableAudioFormats && capabilities.availableAudioFormats.length > 0)
    ? capabilities.availableAudioFormats.map((f) => f.id)
    : ["mp3", "m4a", "wav", "flac", "ogg", "aac"];

  const audioFormats = [
    { id: "mp3", label: "MP3 Audio", ext: ".mp3", supported: supportedAudioIds.includes("mp3") },
    { id: "m4a", label: "M4A Audio", ext: ".m4a", supported: supportedAudioIds.includes("m4a") },
    { id: "wav", label: "WAV Lossless", ext: ".wav", supported: supportedAudioIds.includes("wav") },
    { id: "flac", label: "FLAC Master", ext: ".flac", supported: supportedAudioIds.includes("flac") },
  ];

  // Client-side advisory: Check if selected audio bitrate exceeds source bitrate
  let clientFidelityAdvisory: string | null = null;
  if (activeMediaTab === "audio" || !isVideoSource) {
    if (sourceMetadata.bitrate) {
      const targetBps = parseInt(audioBitrate, 10) * 1000;
      if (targetBps > sourceMetadata.bitrate) {
        const sourceKbps = Math.round(sourceMetadata.bitrate / 1000);
        clientFidelityAdvisory = `Target bitrate (${audioBitrate}) exceeds source audio bitrate (~${sourceKbps} kbps). Re-encoding cannot reconstruct lost acoustic frequencies and will only increase file size.`;
      }
    }
  }

  const handleTabSwitch = (tab: "video" | "audio") => {
    if (cardStatus === "queued" || cardStatus === "processing" || cardStatus === "cancelling") {
      return;
    }
    setActiveMediaTab(tab);
    if (tab === "video") {
      setSelectedFormat("mp4");
    } else {
      setSelectedFormat("mp3");
    }
  };

  const handleCancelJob = async () => {
    if (!activeJobId) {
      setCardStatus("ready");
      setStatusMessage("");
      return;
    }

    setCardStatus("cancelling");
    setStatusMessage("Cancelling conversion job...");

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    try {
      await mediaApiClient.cancelJob(activeJobId);
    } catch {
      // ignore cancellation errors
    } finally {
      setActiveJobId(null);
      setCardStatus("ready");
      setJobProgress(0);
      setStatusMessage("Conversion was cancelled.");
    }
  };

  const handleStartConversion = async () => {
    // Prevent duplicate submissions
    if (
      cardStatus === "queued" ||
      cardStatus === "processing" ||
      cardStatus === "cancelling"
    ) {
      return;
    }

    // Cancel existing abort controller if present
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setCardStatus("queued");
    setJobProgress(0);
    setStatusMessage("Submitting transcoding job to worker queue...");
    setErrorMessage(null);
    setDownloadInfo(null);
    setStrategy(null);
    setFidelityNotice(null);

    const targetFileId = fileId || sourceMetadata.id;
    if (!targetFileId) {
      setCardStatus("failed");
      setErrorMessage(
        "Source file identifier is missing. Please re-upload or re-analyze the media."
      );
      return;
    }

    try {
      const payload: {
        fileId: string;
        targetFormat: string;
        audioBitrate?: "128k" | "192k" | "256k" | "320k";
        videoResolution?: "original" | "1080p" | "720p" | "480p";
        stripVideo?: boolean;
      } = {
        fileId: targetFileId,
        targetFormat: selectedFormat,
      };

      if (activeMediaTab === "audio" || ["mp3", "m4a", "wav", "flac"].includes(selectedFormat)) {
        payload.audioBitrate = audioBitrate;
        payload.stripVideo = true;
      } else {
        payload.videoResolution = effectiveVideoQuality as "original" | "1080p" | "720p" | "480p";
      }

      const createData = await mediaApiClient.createJob(payload, controller.signal);
      const jobId = createData.job.id;
      setActiveJobId(jobId);

      if (createData.job.strategy) {
        setStrategy(createData.job.strategy);
      }
      if (createData.job.fidelityNotice) {
        setFidelityNotice(createData.job.fidelityNotice);
      }

      setCardStatus(createData.job.status === "processing" ? "processing" : "queued");
      setStatusMessage(
        createData.job.status === "processing"
          ? "Processing media with native FFmpeg..."
          : "Queued in transcoding pipeline..."
      );
      // Strictly real server progress
      setJobProgress(createData.job.progress ?? 0);

      // Start polling status at 1000ms intervals
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

      pollIntervalRef.current = setInterval(async () => {
        try {
          const pollRes = await mediaApiClient.getJob(jobId);
          const currentJob = pollRes.job;

          // Real server progress only
          setJobProgress(currentJob.progress ?? 0);

          if (currentJob.strategy) {
            setStrategy(currentJob.strategy);
          }
          if (currentJob.fidelityNotice) {
            setFidelityNotice(currentJob.fidelityNotice);
          }

          if (currentJob.status === "processing") {
            setCardStatus("processing");
            setStatusMessage("Processing media with native FFmpeg...");
          } else if (currentJob.status === "completed") {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            setActiveJobId(null);
            setDownloadInfo({
              id: currentJob.id,
              downloadUrl:
                currentJob.downloadUrl || mediaApiClient.getDownloadUrl(currentJob.id),
              previewUrl: `/api/media/preview/${currentJob.outputFileId || currentJob.id}`,
              filename: currentJob.outputFilename || `${sourceMetadata.filename}.${selectedFormat}`,
              size: currentJob.outputSize || 0,
              timeMs: currentJob.timeMs || 0,
              metadata: currentJob.metadata || sourceMetadata,
            });
            setCardStatus("completed");
            setJobProgress(100);
            setStatusMessage("Conversion completed successfully.");
          } else if (currentJob.status === "failed") {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            setActiveJobId(null);
            setCardStatus("failed");
            setErrorMessage(currentJob.error || "Media transcoding failed.");
          } else if (currentJob.status === "cancelled") {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            setActiveJobId(null);
            setCardStatus("ready");
            setStatusMessage("Conversion was cancelled.");
          } else if (currentJob.status === "expired") {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            setActiveJobId(null);
            setCardStatus("expired");
            setErrorMessage(
              "Conversion output has expired and was cleaned up per privacy retention rules."
            );
          }
        } catch (pollErr) {
          const norm = normalizeActionableError(pollErr);
          if (norm.statusCode === 404 || norm.code === "JOB_NOT_FOUND") {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            setActiveJobId(null);
            setCardStatus("expired");
            setErrorMessage(
              "Conversion job has expired or could not be found. Please restart the conversion."
            );
          }
        }
      }, 1000);
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "ABORTED") {
        return;
      }
      setCardStatus("failed");
      const norm = normalizeActionableError(err);
      setErrorMessage(norm.message);
    }
  };

  const isBusy =
    cardStatus === "queued" ||
    cardStatus === "processing" ||
    cardStatus === "cancelling";

  return (
    <div
      className="w-full rounded-2xl border border-slate-200/90 bg-white shadow-md shadow-slate-100 overflow-hidden transition-all"
      role="region"
      aria-label="Media analysis and conversion studio"
    >
      {/* Top Header / Status bar */}
      <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant={sourceType === "upload" ? "primary" : "neutral"} size="sm">
            {sourceType === "upload" ? "Local Media File" : "Verified Direct Stream"}
          </Badge>
          <span className="text-xs text-slate-500 font-medium">
            Format: <strong className="text-slate-800 uppercase">{sourceMetadata.format}</strong>
          </span>
          {strategy && (
            <Badge variant={strategy === "remux" ? "success" : "primary"} size="sm">
              {strategy === "remux" ? "Lossless Stream Copy (Remux)" : "FFmpeg Transcode"}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {cardStatus === "completed" ? (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80"
              role="status"
              aria-live="polite"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Ready for Download
            </span>
          ) : cardStatus === "processing" ? (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200/80 animate-pulse"
              role="status"
              aria-live="polite"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Transcoding ({jobProgress}%)...
            </span>
          ) : cardStatus === "queued" ? (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/80"
              role="status"
              aria-live="polite"
            >
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              Queued...
            </span>
          ) : cardStatus === "cancelling" ? (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200/80"
              role="status"
              aria-live="polite"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Cancelling...
            </span>
          ) : cardStatus === "expired" ? (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200"
              role="status"
              aria-live="polite"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Job Expired
            </span>
          ) : (
            <span className="text-xs font-semibold text-slate-500">Analysis Verified</span>
          )}

          {onReset && (
            <button
              onClick={() => {
                if (isBusy) {
                  handleCancelJob();
                }
                onReset();
              }}
              type="button"
              className="text-xs font-semibold text-slate-400 hover:text-slate-700 underline px-2 py-1 transition-colors"
              title="Reset media workbench"
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
                {sourceMetadata.audioSampleRate
                  ? `${(sourceMetadata.audioSampleRate / 1000).toFixed(1)}kHz`
                  : ""}
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
              disabled={!isVideoSource || isBusy}
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
              disabled={isBusy}
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
                    disabled={!fmt.supported || isBusy}
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
                    disabled={!fmt.supported || isBusy}
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
                value={effectiveVideoQuality}
                onChange={(e) => setVideoQuality(e.target.value)}
                options={availableResolutionOptions}
                disabled={isBusy}
                helperText="Resolution restricted to supported source dimensions (no artificial upscaling)"
              />
            ) : (
              <Select
                label="Audio Bitrate"
                value={audioBitrate}
                onChange={(e) =>
                  setAudioBitrate(e.target.value as "128k" | "192k" | "256k" | "320k")
                }
                options={SITE_CONFIG.bitratePresets}
                disabled={isBusy}
                helperText="Select output audio compression bitrate"
              />
            )}
          </div>

          {/* Fidelity notices / warnings */}
          {(fidelityNotice || clientFidelityAdvisory) && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-800 text-xs">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>{fidelityNotice || clientFidelityAdvisory}</span>
            </div>
          )}
        </div>

        {/* Action Trigger */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200/70">
          <span className="text-xs text-slate-500">
            Target Output: <strong className="text-slate-800 uppercase">{selectedFormat}</strong>{" "}
            ({activeMediaTab === "video" ? effectiveVideoQuality : audioBitrate})
          </span>

          <Button
            variant="primary"
            size="lg"
            onClick={handleStartConversion}
            isLoading={isBusy}
            disabled={isBusy}
            leftIcon={<Play className="w-4 h-4 fill-white" />}
          >
            {cardStatus === "processing"
              ? "Transcoding Media..."
              : cardStatus === "queued"
              ? "Queued in Worker..."
              : cardStatus === "cancelling"
              ? "Cancelling..."
              : `Convert to ${selectedFormat.toUpperCase()}`}
          </Button>
        </div>

        {/* Live Processing Progress Bar */}
        {(cardStatus === "processing" || cardStatus === "queued") && (
          <div
            className="space-y-3 pt-2"
            role="status"
            aria-live="polite"
          >
            <ProgressBar
              progress={jobProgress}
              label={`${statusMessage} (${jobProgress}%)`}
              sublabel="Native FFmpeg process execution with real-time progress tracking"
            />
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelJob}
                className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
              >
                Cancel Transcoding
              </Button>
            </div>
          </div>
        )}

        {/* Expired State Notice */}
        {cardStatus === "expired" && (
          <div className="space-y-3 pt-2">
            <Alert
              variant="warning"
              title="Conversion Job Expired"
            >
              The temporary conversion output has expired and was safely purged from server disk to respect file privacy. Please restart the conversion to re-generate the file.
            </Alert>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCardStatus("ready");
                  setErrorMessage(null);
                }}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Reset and Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Error Notice with Retry */}
        {cardStatus === "failed" && errorMessage && (
          <div className="space-y-3 pt-2">
            <Alert
              variant="error"
              title="Conversion Failed"
              onDismiss={() => setErrorMessage(null)}
            >
              {errorMessage}
            </Alert>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCardStatus("ready");
                  setErrorMessage(null);
                }}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Retry Conversion
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Completed Download & In-Browser Preview View */}
      {cardStatus === "completed" && downloadInfo && (
        <div
          className="p-5 sm:p-6 border-t border-emerald-100 bg-emerald-50/20 space-y-5 animate-in fade-in duration-300"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 mb-1">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Transcoding Finished Successfully
              </div>
              <p className="text-xs text-slate-500">
                Processed in {(downloadInfo.timeMs / 1000).toFixed(2)}s • Output size:{" "}
                <strong>{formatBytes(downloadInfo.size)}</strong>
              </p>
            </div>

            <a
              href={downloadInfo.downloadUrl}
              download={downloadInfo.filename}
              aria-label={`Download converted file ${downloadInfo.filename}`}
            >
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
