"use client";

import React, { useState, useRef } from "react";
import {
  Music2,
  FileVideo,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { MediaPreview } from "@/components/media/MediaPreview";
import { formatBytes, formatDuration } from "@/lib/utils/format";
import { SITE_CONFIG } from "@/config/site";
import { MediaMetadata } from "@/lib/validation/schemas";

export function AudioExtractorTool() {
  const [fileId, setFileId] = useState<string | null>(null);
  const [sourceMetadata, setSourceMetadata] = useState<MediaMetadata | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [targetAudioFormat, setTargetAudioFormat] = useState("mp3");
  const [audioBitrate, setAudioBitrate] = useState<"128k" | "192k" | "256k" | "320k">("320k");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{
    id: string;
    filename: string;
    size: number;
    downloadUrl: string;
    previewUrl: string;
    metadata?: MediaMetadata;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setErrorMessage(null);
    setResult(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload failed.");
      }

      setFileId(data.fileId);
      setSourceMetadata(data.metadata);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDemoVideo = async () => {
    setErrorMessage(null);
    setResult(null);
    setIsUploading(true);

    try {
      const res = await fetch("/api/media/sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "video" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load video sample.");

      setFileId(data.fileId);
      setSourceMetadata(data.metadata);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error loading demo.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleExtract = async () => {
    if (!fileId) return;

    setErrorMessage(null);
    setIsExtracting(true);

    try {
      const res = await fetch("/api/media/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId,
          targetFormat: targetAudioFormat,
          audioBitrate,
          stripVideo: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Extraction failed.");
      }

      setResult({
        id: data.result.id,
        filename: data.result.filename,
        size: data.result.size,
        downloadUrl: data.downloadUrl,
        previewUrl: data.previewUrl,
        metadata: data.result.metadata,
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Extraction failed.");
    } finally {
      setIsExtracting(false);
    }
  };

  const audioFormats = [
    { value: "mp3", label: "MP3 (Standard Audio - 320k)" },
    { value: "wav", label: "WAV (Uncompressed PCM Lossless)" },
    { value: "aac", label: "AAC (High Fidelity Apple/MPEG-4)" },
    { value: "flac", label: "FLAC (Lossless Master Quality)" },
    { value: "ogg", label: "OGG (Vorbis Open Audio)" },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-dashed border-2 border-slate-300 bg-white/70">
        <CardContent className="p-8 sm:p-10 flex flex-col items-center text-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleUpload(e.target.files[0]);
              }
            }}
            accept="video/*,.mp4,.webm,.mkv,.mov,.avi"
            className="hidden"
          />

          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 mb-4">
            <Music2 className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-1">
            Extract Audio Track from Video
          </h3>
          <p className="text-xs text-slate-500 max-w-md mb-5">
            Strip video frames and save pure audio soundtracks directly in lossless or compressed formats.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isExtracting}
            >
              Select Video File
            </Button>

            <span className="text-xs text-slate-400">or</span>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDemoVideo}
              disabled={isUploading || isExtracting}
              leftIcon={<FileVideo className="w-3.5 h-3.5 text-violet-600" />}
            >
              Test with Demo Video
            </Button>
          </div>

          {isUploading && (
            <div className="w-full max-w-xs mt-6">
              <ProgressBar indeterminate label="Uploading and analyzing video streams..." />
            </div>
          )}
        </CardContent>
      </Card>

      {errorMessage && (
        <Alert variant="error" title="Extraction Issue" onDismiss={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      {sourceMetadata && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <FileVideo className="w-5 h-5" />
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
                {sourceMetadata.audioCodec && (
                  <Badge variant="neutral">Audio: {sourceMetadata.audioCodec.toUpperCase()}</Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Target Audio Format"
                value={targetAudioFormat}
                onChange={(e) => setTargetAudioFormat(e.target.value)}
                options={audioFormats}
              />

              <Select
                label="Audio Bitrate"
                value={audioBitrate}
                onChange={(e) => setAudioBitrate(e.target.value as "128k" | "192k" | "256k" | "320k")}
                options={SITE_CONFIG.bitratePresets}
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <Button
                variant="primary"
                size="lg"
                onClick={handleExtract}
                isLoading={isExtracting}
                disabled={isExtracting}
                leftIcon={<Music2 className="w-4 h-4" />}
              >
                {isExtracting ? "Extracting Audio..." : `Extract ${targetAudioFormat.toUpperCase()} Audio`}
              </Button>
            </div>

            {isExtracting && (
              <ProgressBar
                indeterminate
                label="Demuxing video container and encoding audio track..."
              />
            )}
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <Alert variant="success" title="Audio Extracted Successfully!">
            Audio track extracted and saved as <strong>{result.filename}</strong>.
          </Alert>

          <MediaPreview
            id={result.id}
            downloadUrl={result.downloadUrl}
            previewUrl={result.previewUrl}
            filename={result.filename}
            size={result.size}
            metadata={result.metadata}
            targetFormat={targetAudioFormat}
          />
        </div>
      )}
    </div>
  );
}
