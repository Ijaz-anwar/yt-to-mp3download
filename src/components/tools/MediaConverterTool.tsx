"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileAudio,
  FileVideo,
  Sliders,
  Play,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { MediaPreview } from "@/components/media/MediaPreview";
import { MetadataInspectorCard } from "@/components/media/MetadataInspectorCard";
import { SITE_CONFIG } from "@/config/site";
import { formatBytes, formatDuration } from "@/lib/utils/format";
import { MediaMetadata } from "@/lib/validation/schemas";

interface ConversionResult {
  id: string;
  filename: string;
  size: number;
  timeMs: number;
  downloadUrl: string;
  previewUrl: string;
  metadata: MediaMetadata;
}

export function MediaConverterTool() {
  const [fileId, setFileId] = useState<string | null>(null);
  const [sourceMetadata, setSourceMetadata] = useState<MediaMetadata | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Conversion options
  const [targetFormat, setTargetFormat] = useState("mp3");
  const [audioBitrate, setAudioBitrate] = useState<"128k" | "192k" | "256k" | "320k">("192k");
  const [audioSampleRate, setAudioSampleRate] = useState<44100 | 48000>(44100);
  const [videoResolution, setVideoResolution] = useState<"original" | "1080p" | "720p" | "480p">("original");
  const [trimStart, setTrimStart] = useState<string>("");
  const [trimEnd, setTrimEnd] = useState<string>("");
  const [volume, setVolume] = useState<string>("1.0");
  const [stripVideo, setStripVideo] = useState(false);
  const [stripAudio, setStripAudio] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Conversion status
  const [isConverting, setIsConverting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<ConversionResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (selectedFile: File) => {
    setErrorMessage(null);
    setSuccessResult(null);
    setIsUploading(true);
    setUploadProgress(25);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      setUploadProgress(60);

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setUploadProgress(100);

      if (!res.ok) {
        throw new Error(data.error || "File upload failed.");
      }

      setFileId(data.fileId);
      setSourceMetadata(data.metadata);

      // Auto-set sensible target format
      if (data.metadata?.hasVideo) {
        setTargetFormat("mp4");
      } else {
        setTargetFormat("mp3");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error uploading file.");
      setFileId(null);
      setSourceMetadata(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleLoadSample = async (type: "audio" | "video") => {
    setErrorMessage(null);
    setSuccessResult(null);
    setIsUploading(true);
    setUploadProgress(40);

    try {
      const res = await fetch("/api/media/sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      const data = await res.json();
      setUploadProgress(100);

      if (!res.ok) {
        throw new Error(data.error || "Failed to load sample.");
      }

      setFileId(data.fileId);
      setSourceMetadata(data.metadata);
      setTargetFormat(type === "video" ? "mp3" : "wav");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load test sample.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleConvert = async () => {
    if (!fileId) {
      setErrorMessage("Please select or upload a media file first.");
      return;
    }

    setErrorMessage(null);
    setIsConverting(true);

    try {
      const payload: Record<string, unknown> = {
        fileId,
        targetFormat,
      };

      const isAudio = ["mp3", "wav", "aac", "ogg", "flac", "m4a"].includes(targetFormat);
      if (isAudio || targetFormat === "mp4" || targetFormat === "webm") {
        payload.audioBitrate = audioBitrate;
        payload.audioSampleRate = Number(audioSampleRate);
      }

      if (!isAudio) {
        payload.videoResolution = videoResolution;
        payload.stripAudio = stripAudio;
      }

      if (trimStart && !isNaN(Number(trimStart)) && Number(trimStart) > 0) {
        payload.trimStart = Number(trimStart);
      }
      if (trimEnd && !isNaN(Number(trimEnd)) && Number(trimEnd) > 0) {
        payload.trimEnd = Number(trimEnd);
      }

      if (volume && !isNaN(Number(volume)) && Number(volume) !== 1) {
        payload.volume = Number(volume);
      }

      const res = await fetch("/api/media/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Conversion failed on server.");
      }

      setSuccessResult({
        id: data.result.id,
        filename: data.result.filename,
        size: data.result.size,
        timeMs: data.result.timeMs,
        downloadUrl: data.downloadUrl,
        previewUrl: data.previewUrl,
        metadata: data.result.metadata,
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Media conversion failed.");
    } finally {
      setIsConverting(false);
    }
  };

  const allFormats = [
    ...SITE_CONFIG.supportedFormats.audio.map((f) => ({
      value: f.id,
      label: `${f.name} (${f.ext})`,
    })),
    ...SITE_CONFIG.supportedFormats.video.map((f) => ({
      value: f.id,
      label: `${f.name} (${f.ext})`,
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Upload Box */}
      <Card className="border-dashed border-2 border-slate-300 hover:border-indigo-400 bg-white/70 transition-colors">
        <CardContent className="p-8 sm:p-12 flex flex-col items-center text-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
            accept="audio/*,video/*,.mp3,.wav,.ogg,.aac,.flac,.m4a,.mp4,.webm,.mkv,.mov"
            className="hidden"
            id="media-file-input"
          />

          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4 shadow-xs">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-1">
            Choose a media file or drag & drop here
          </h3>
          <p className="text-xs text-slate-500 max-w-md mb-6">
            Supports MP4, WebM, MKV, MP3, WAV, AAC, FLAC, OGG up to{" "}
            {SITE_CONFIG.maxUploadSizeBytes / (1024 * 1024)}MB. Processed entirely via local FFmpeg.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isConverting}
            >
              Browse Local Files
            </Button>

            <span className="text-xs font-semibold text-slate-400">or try samples:</span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleLoadSample("audio")}
              disabled={isUploading || isConverting}
              leftIcon={<FileAudio className="w-3.5 h-3.5 text-indigo-600" />}
            >
              Demo Audio (Sine 528Hz)
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleLoadSample("video")}
              disabled={isUploading || isConverting}
              leftIcon={<FileVideo className="w-3.5 h-3.5 text-violet-600" />}
            >
              Demo Video (Pattern HD)
            </Button>
          </div>

          {isUploading && (
            <div className="w-full max-w-sm mt-6">
              <ProgressBar
                progress={uploadProgress}
                indeterminate={uploadProgress === 100}
                label="Uploading and analyzing stream..."
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Alert */}
      {errorMessage && (
        <Alert variant="error" title="Operation Error" onDismiss={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      {/* Selected File Details & Conversion Settings */}
      {sourceMetadata && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold">
                  {sourceMetadata.hasVideo ? (
                    <FileVideo className="w-5 h-5" />
                  ) : (
                    <FileAudio className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 truncate">
                    {sourceMetadata.filename}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {formatBytes(sourceMetadata.size)} •{" "}
                    {sourceMetadata.duration ? formatDuration(sourceMetadata.duration) : "Unknown duration"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="primary">{sourceMetadata.format.toUpperCase()}</Badge>
                {sourceMetadata.videoWidth && (
                  <Badge variant="neutral">
                    {sourceMetadata.videoWidth}x{sourceMetadata.videoHeight}
                  </Badge>
                )}
                {sourceMetadata.audioCodec && (
                  <Badge variant="outline">{sourceMetadata.audioCodec.toUpperCase()}</Badge>
                )}
              </div>
            </div>

            {/* Target Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Select
                label="Target Format"
                value={targetFormat}
                onChange={(e) => setTargetFormat(e.target.value)}
                options={allFormats}
                helperText="Select desired output container"
              />

              <Select
                label="Audio Bitrate"
                value={audioBitrate}
                onChange={(e) => setAudioBitrate(e.target.value as unknown as "128k" | "192k" | "256k" | "320k")}
                options={SITE_CONFIG.bitratePresets}
                helperText="Higher bitrate yields superior audio fidelity"
              />

              {sourceMetadata.hasVideo && !["mp3", "wav", "aac", "ogg", "flac"].includes(targetFormat) ? (
                <Select
                  label="Video Resolution"
                  value={videoResolution}
                  onChange={(e) => setVideoResolution(e.target.value as "original" | "1080p" | "720p" | "480p")}
                  options={SITE_CONFIG.resolutionPresets}
                  helperText="Downscale or maintain original resolution"
                />
              ) : (
                <Select
                  label="Audio Sample Rate"
                  value={audioSampleRate}
                  onChange={(e) => setAudioSampleRate(Number(e.target.value) as 44100 | 48000)}
                  options={SITE_CONFIG.sampleRatePresets}
                  helperText="Sampling frequency in Hz"
                />
              )}
            </div>

            {/* Advanced Toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{showAdvanced ? "Hide Advanced Options" : "Show Advanced Options (Trim, Volume)"}</span>
              </button>

              {showAdvanced && (
                <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Trim Start (seconds)"
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="e.g. 0"
                    value={trimStart}
                    onChange={(e) => setTrimStart(e.target.value)}
                    helperText="Skip beginning segment"
                  />

                  <Input
                    label="Trim End (seconds)"
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="e.g. 30"
                    value={trimEnd}
                    onChange={(e) => setTrimEnd(e.target.value)}
                    helperText="Truncate media at timestamp"
                  />

                  <Input
                    label="Audio Volume Multiplier"
                    type="number"
                    min="0"
                    max="3"
                    step="0.1"
                    placeholder="1.0"
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    helperText="1.0 = 100%, 1.5 = 150%"
                  />

                  <div className="sm:col-span-3 pt-2 flex flex-wrap items-center gap-6 border-t border-slate-200/60">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={stripAudio}
                        onChange={(e) => setStripAudio(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Mute / Remove Audio Track</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={stripVideo}
                        onChange={(e) => setStripVideo(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Extract Audio Track Only (Discard Video)</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Convert Trigger Button */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-slate-500">
                Target: <strong className="text-slate-800 uppercase">{targetFormat}</strong> • Native FFmpeg transcode
              </span>

              <Button
                variant="primary"
                size="lg"
                onClick={handleConvert}
                isLoading={isConverting}
                disabled={isConverting}
                rightIcon={<Play className="w-4 h-4 fill-white" />}
              >
                {isConverting ? "Transcoding Media..." : `Convert to ${targetFormat.toUpperCase()}`}
              </Button>
            </div>

            {isConverting && (
              <ProgressBar
                indeterminate
                label="Processing media with FFmpeg..."
                sublabel="Transcoding streams, audio resampling & muxing"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Success Result & Preview */}
      {successResult && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <Alert variant="success" title="Conversion Complete!">
            Your media file was successfully transcoded to{" "}
            <strong>{successResult.filename}</strong> in{" "}
            {(successResult.timeMs / 1000).toFixed(2)}s.
          </Alert>

          <MediaPreview
            id={successResult.id}
            downloadUrl={successResult.downloadUrl}
            previewUrl={successResult.previewUrl}
            filename={successResult.filename}
            size={successResult.size}
            metadata={successResult.metadata}
            targetFormat={targetFormat}
          />

          {successResult.metadata && (
            <MetadataInspectorCard metadata={successResult.metadata} />
          )}
        </div>
      )}
    </div>
  );
}
