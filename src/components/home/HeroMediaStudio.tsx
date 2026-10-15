"use client";

import React, { useState, useRef } from "react";
import {
  Link2,
  Clipboard,
  UploadCloud,
  Search,
  Sparkles,
  ShieldCheck,
  FileAudio,
  FileVideo,
  Lock,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { MediaResultCard } from "@/components/media/MediaResultCard";
import { MediaMetadata } from "@/lib/validation/schemas";

export function HeroMediaStudio() {
  const [url, setUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clipboardNotice, setClipboardNotice] = useState<string | null>(null);

  // Active loaded media data
  const [loadedMedia, setLoadedMedia] = useState<{
    metadata: MediaMetadata;
    sourceType: "upload" | "url";
    directUrl?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick preset direct streams for testing
  const samplePresets = [
    {
      label: "Audio Sample (Creative Commons OGG)",
      url: "https://actions.google.com/sounds/v1/science_fiction/teleport.ogg",
    },
    {
      label: "Podcast Stream (Google Public Audio)",
      url: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg",
    },
  ];

  // Clipboard paste with graceful permission error handling
  const handlePasteClipboard = async () => {
    setClipboardNotice(null);
    setErrorMessage(null);

    if (!navigator.clipboard || !navigator.clipboard.readText) {
      setClipboardNotice("Clipboard API is not supported in this browser. Please use Ctrl+V to paste.");
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setUrl(text.trim());
      } else {
        setClipboardNotice("Clipboard is empty or contains non-text content.");
      }
    } catch {
      setClipboardNotice(
        "Browser clipboard permission was blocked. Please press Ctrl+V or right-click into the input to paste."
      );
    }
  };

  // Inspect and analyze remote media URL
  const handleAnalyzeUrl = async (targetUrl?: string) => {
    const finalUrl = (targetUrl || url).trim();
    if (!finalUrl) {
      setErrorMessage("Please enter or paste a valid HTTP or HTTPS media URL.");
      return;
    }

    setErrorMessage(null);
    setClipboardNotice(null);
    setIsAnalyzing(true);
    setAnalysisProgress(30);

    try {
      setAnalysisProgress(50);
      const res = await fetch("/api/media/inspect-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: finalUrl }),
      });

      const data = await res.json();
      setAnalysisProgress(80);

      if (!res.ok) {
        throw new Error(data.error || "Unable to inspect the remote media URL.");
      }

      setAnalysisProgress(100);

      const inspectInfo = data.info;
      const isVideo =
        inspectInfo.contentType?.startsWith("video/") ||
        /\.(mp4|webm|mkv|mov)$/i.test(inspectInfo.filename);

      // Create initial metadata record from verified HEAD
      const remoteMeta: MediaMetadata = {
        id: "",
        filename: inspectInfo.filename,
        format: inspectInfo.filename?.split(".").pop() || "media",
        formatLongName: inspectInfo.contentType,
        size: inspectInfo.contentLength || 0,
        mimeType: inspectInfo.contentType,
        hasAudio: true,
        hasVideo: isVideo,
        isDirectUrl: true,
      };

      setLoadedMedia({
        metadata: remoteMeta,
        sourceType: "url",
        directUrl: finalUrl,
      });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to analyze the requested media stream."
      );
      setLoadedMedia(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Upload local media file
  const handleFileUpload = async (file: File) => {
    setErrorMessage(null);
    setClipboardNotice(null);
    setIsAnalyzing(true);
    setAnalysisProgress(20);

    try {
      const formData = new FormData();
      formData.append("file", file);

      setAnalysisProgress(60);
      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setAnalysisProgress(100);

      if (!res.ok) {
        throw new Error(data.error || "File upload failed.");
      }

      setLoadedMedia({
        metadata: data.metadata,
        sourceType: "upload",
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Upload processing failed.");
      setLoadedMedia(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Generate instant demo sample for local testing
  const handleLoadDemo = async (type: "audio" | "video") => {
    setErrorMessage(null);
    setClipboardNotice(null);
    setIsAnalyzing(true);
    setAnalysisProgress(40);

    try {
      const res = await fetch("/api/media/sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      const data = await res.json();
      setAnalysisProgress(100);

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate demo sample.");
      }

      setLoadedMedia({
        metadata: data.metadata,
        sourceType: "upload",
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to generate sample.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div id="hero" className="w-full">
      {/* Hero Headline Area */}
      <section className="pt-12 pb-8 sm:pt-16 sm:pb-12 text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-bold mb-6 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fast Native Transcoder • Pure Local Processing</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950 max-w-3xl mx-auto leading-tight">
            Download and Convert Media in One Simple Place
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Process and convert audio or video files you own or are explicitly authorized to
            download. Enjoy studio-grade bitrates, seamless video transcoding, and zero tracking.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500 font-semibold">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Verified Local FFmpeg
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-indigo-600" />
              Auto Staging Purge
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              320k Lossless Audio
            </span>
          </div>
        </div>
      </section>

      {/* Main Interactive Studio Container */}
      <section id="tool-section" className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 -mt-2 mb-16">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-8 shadow-xl shadow-slate-100/80 space-y-6">
          {/* URL Input Form */}
          <div className="space-y-3">
            <label
              htmlFor="media-url-input"
              className="text-xs font-bold text-slate-900 uppercase tracking-wider block"
            >
              Direct Media URL
            </label>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1 flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
                  <Link2 className="w-4 h-4" />
                </div>

                <input
                  id="media-url-input"
                  type="url"
                  placeholder="Paste direct media link (e.g., https://example.com/podcast.mp3)"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isAnalyzing}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50/50 pl-10 pr-24 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15"
                />

                {/* Paste from clipboard button */}
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  disabled={isAnalyzing}
                  className="absolute right-2 px-2.5 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-xl transition-colors flex items-center gap-1 select-none"
                  title="Paste from clipboard"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Paste</span>
                </button>
              </div>

              {/* Primary Analyze Media Button */}
              <Button
                variant="primary"
                size="md"
                onClick={() => handleAnalyzeUrl()}
                isLoading={isAnalyzing}
                disabled={isAnalyzing || !url.trim()}
                leftIcon={<Search className="w-4 h-4" />}
                className="py-3.5 px-6 font-bold shadow-sm"
              >
                Analyze Media
              </Button>
            </div>

            {/* Quick Presets for 1-click test */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-slate-400 font-semibold">Try sample streams:</span>
              {samplePresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setUrl(preset.url);
                    handleAnalyzeUrl(preset.url);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200/80 w-full" />
            <span className="bg-white px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Or Process Local Media
            </span>
          </div>

          {/* Local File Upload Drop Target */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileUpload(e.dataTransfer.files[0]);
              }
            }}
            className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 sm:p-8 text-center bg-slate-50/40 transition-colors flex flex-col items-center justify-center"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
              accept="audio/*,video/*,.mp4,.webm,.mkv,.mp3,.m4a,.wav,.ogg,.flac"
              className="hidden"
              id="hero-file-picker"
            />

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3 shadow-2xs">
              <UploadCloud className="w-6 h-6" />
            </div>

            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Select or Drop Local Media File
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mb-4">
              Upload video or audio from your computer (MP4, WebM, MP3, WAV, M4A up to 250 MB).
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzing}
              >
                Browse Device Files
              </Button>

              <span className="text-xs text-slate-400 font-medium">or test generator:</span>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleLoadDemo("video")}
                disabled={isAnalyzing}
                leftIcon={<FileVideo className="w-3.5 h-3.5 text-indigo-600" />}
              >
                Demo Video
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleLoadDemo("audio")}
                disabled={isAnalyzing}
                leftIcon={<FileAudio className="w-3.5 h-3.5 text-violet-600" />}
              >
                Demo 528Hz Audio
              </Button>
            </div>
          </div>

          {/* Analysis Progress */}
          {isAnalyzing && (
            <div className="pt-2">
              <ProgressBar
                progress={analysisProgress}
                indeterminate={analysisProgress === 100}
                label="Probing and analyzing media streams..."
                sublabel="Inspecting headers, codecs, duration, and stream safety"
              />
            </div>
          )}

          {/* Clipboard Notice / Fallback Tip */}
          {clipboardNotice && (
            <Alert variant="info" title="Clipboard Note" onDismiss={() => setClipboardNotice(null)}>
              {clipboardNotice}
            </Alert>
          )}

          {/* Error Notice */}
          {errorMessage && (
            <Alert variant="error" title="Input Unsupported or Error" onDismiss={() => setErrorMessage(null)}>
              {errorMessage}
            </Alert>
          )}

          {/* Rights & Supported Sources Requirement Notice */}
          <Alert variant="info" title="Supported Sources & Rights Notice">
            MediaNest exclusively supports authorized local files and direct media endpoints explicitly
            permitted by their creators. In strict compliance with intellectual property standards,
            DRM circumvention, private stream extraction, and unauthorized platform scraping are strictly
            disallowed.
          </Alert>
        </div>

        {/* Result Area: Reusable MediaResultCard when media is analyzed */}
        {loadedMedia && (
          <div className="mt-8 animate-in fade-in duration-300">
            <MediaResultCard
              sourceMetadata={loadedMedia.metadata}
              sourceType={loadedMedia.sourceType}
              directUrl={loadedMedia.directUrl}
              onReset={() => {
                setLoadedMedia(null);
                setUrl("");
              }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
