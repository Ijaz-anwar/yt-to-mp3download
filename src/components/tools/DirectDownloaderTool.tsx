"use client";

import React, { useState } from "react";
import {
  Link2,
  Search,
  Download,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { MediaPreview } from "@/components/media/MediaPreview";
import { MetadataInspectorCard } from "@/components/media/MetadataInspectorCard";
import { formatBytes } from "@/lib/utils/format";
import { MediaMetadata } from "@/lib/validation/schemas";

interface InspectResult {
  url: string;
  filename: string;
  contentType: string;
  contentLength?: number;
  acceptRanges: boolean;
  isMedia: boolean;
}

export function DirectDownloaderTool() {
  const [url, setUrl] = useState("");
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectData, setInspectData] = useState<InspectResult | null>(null);

  // Conversion / Download State
  const [targetFormat, setTargetFormat] = useState("mp3");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    id: string;
    filename: string;
    size: number;
    downloadUrl: string;
    previewUrl: string;
    metadata?: MediaMetadata;
  } | null>(null);

  const testUrls = [
    {
      label: "Open Test Tone (WAV Audio)",
      url: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg",
    },
    {
      label: "Creative Commons Sample (Audio OGG)",
      url: "https://actions.google.com/sounds/v1/science_fiction/teleport.ogg",
    },
  ];

  const handleInspect = async (overrideUrl?: string) => {
    const targetUrl = overrideUrl || url;
    if (!targetUrl.trim()) {
      setErrorMessage("Please enter a valid HTTP or HTTPS media URL.");
      return;
    }

    setErrorMessage(null);
    setInspectData(null);
    setSuccessResult(null);
    setIsInspecting(true);

    try {
      const res = await fetch("/api/media/inspect-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to inspect the remote URL.");
      }

      setInspectData(data.info);
      if (data.info.filename?.endsWith(".mp4") || data.info.contentType?.includes("video")) {
        setTargetFormat("mp4");
      } else {
        setTargetFormat("mp3");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Inspection failed.");
    } finally {
      setIsInspecting(false);
    }
  };

  const handleDownloadAndConvert = async () => {
    if (!url.trim()) return;

    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const res = await fetch("/api/media/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          directUrl: url.trim(),
          targetFormat,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to download and transcode remote stream.");
      }

      setSuccessResult({
        id: data.result.id,
        filename: data.result.filename,
        size: data.result.size,
        downloadUrl: data.downloadUrl,
        previewUrl: data.previewUrl,
        metadata: data.result.metadata,
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Processing failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formats = [
    { value: "mp3", label: "MP3 Audio (.mp3)" },
    { value: "wav", label: "WAV Lossless (.wav)" },
    { value: "aac", label: "AAC Audio (.aac)" },
    { value: "flac", label: "FLAC Master Audio (.flac)" },
    { value: "ogg", label: "OGG Vorbis (.ogg)" },
    { value: "mp4", label: "MP4 Video (.mp4)" },
    { value: "webm", label: "WebM Video (.webm)" },
  ];

  return (
    <div className="space-y-6">
      {/* Compliance Notice */}
      <Alert variant="info" title="Permitted Media & Terms Compliance">
        MediaNest supports direct authorized media links (such as public podcast feeds, open CDN media,
        and Creative Commons samples). MediaNest strictly abides by platform terms: DRM circumvention,
        access-control bypasses, and unauthorized YouTube extraction are not supported.
      </Alert>

      {/* URL Input Form */}
      <Card>
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <h3 className="text-base font-bold text-slate-900">
              Enter Permitted Direct Media URL
            </h3>
            <p className="text-xs text-slate-500">
              Provide a direct media endpoint URL (e.g. podcast MP3, public domain MP4, or open-licensed audio stream).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                type="url"
                placeholder="https://example.com/podcast-episode-01.mp3"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                leftIcon={<Link2 className="w-4 h-4 text-slate-400" />}
                disabled={isInspecting || isProcessing}
              />
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => handleInspect()}
              isLoading={isInspecting}
              disabled={isInspecting || isProcessing || !url.trim()}
              leftIcon={<Search className="w-4 h-4" />}
            >
              Inspect Stream
            </Button>
          </div>

          {/* Quick preset links for verification */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-slate-400 font-semibold">Try sample streams:</span>
            {testUrls.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setUrl(preset.url);
                  handleInspect(preset.url);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
              >
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Error alert */}
      {errorMessage && (
        <Alert variant="error" title="Stream Error" onDismiss={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      {/* Inspected Stream Details */}
      {inspectData && (
        <Card className="border-indigo-100 bg-indigo-50/20">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h4 className="text-sm font-bold text-slate-900">Stream Verified & Accessible</h4>
              </div>
              <Badge variant={inspectData.isMedia ? "success" : "warning"}>
                {inspectData.isMedia ? "Valid Media" : "Binary Stream"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl bg-white p-3 border border-slate-200/80">
                <span className="text-slate-400 font-medium block mb-1">Detected Filename</span>
                <span className="font-bold text-slate-800 truncate block" title={inspectData.filename}>
                  {inspectData.filename}
                </span>
              </div>

              <div className="rounded-xl bg-white p-3 border border-slate-200/80">
                <span className="text-slate-400 font-medium block mb-1">Content-Type</span>
                <span className="font-bold text-slate-800">{inspectData.contentType}</span>
              </div>

              <div className="rounded-xl bg-white p-3 border border-slate-200/80">
                <span className="text-slate-400 font-medium block mb-1">File Size</span>
                <span className="font-bold text-slate-800">
                  {inspectData.contentLength ? formatBytes(inspectData.contentLength) : "Dynamic / Chunked"}
                </span>
              </div>
            </div>

            {/* Target Conversion Selector */}
            <div className="flex flex-col sm:flex-row items-end gap-4 pt-3">
              <div className="w-full sm:w-64">
                <Select
                  label="Target Format for Fetch"
                  value={targetFormat}
                  onChange={(e) => setTargetFormat(e.target.value)}
                  options={formats}
                />
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={handleDownloadAndConvert}
                isLoading={isProcessing}
                disabled={isProcessing}
                leftIcon={<Download className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                {isProcessing ? "Fetching & Converting..." : `Download & Convert to ${targetFormat.toUpperCase()}`}
              </Button>
            </div>

            {isProcessing && (
              <ProgressBar
                indeterminate
                label="Streaming media from host and processing..."
                sublabel="Validating bytes, transcoding via FFmpeg pipeline"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Success Result */}
      {successResult && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <Alert variant="success" title="Stream Processed Successfully!">
            The remote media stream was downloaded and converted to{" "}
            <strong>{successResult.filename}</strong>.
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
