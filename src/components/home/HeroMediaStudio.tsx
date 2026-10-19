"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Link2,
  Clipboard,
  Sparkles,
  Music2,
  Video,
  Zap,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { YouTubeDownloadCard } from "@/components/media/YouTubeDownloadCard";
import { MediaMetadata } from "@/lib/validation/schemas";
import { MediaCapabilities } from "@/lib/services/format-capabilities";
import { mediaApiClient, ApiClientError } from "@/lib/api/media-client";
import { Locale } from "@/lib/i18n/translations";
import { useTranslation } from "@/lib/i18n/useTranslation";

export type HeroStudioState = "idle" | "analyzing" | "ready";

export function HeroMediaStudio({ locale: explicitLocale }: { locale?: Locale } = {}) {
  const { locale, t } = useTranslation(explicitLocale);
  const [url, setUrl] = useState("");
  const [studioState, setStudioState] = useState<HeroStudioState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clipboardNotice, setClipboardNotice] = useState<string | null>(null);

  const [loadedMedia, setLoadedMedia] = useState<{
    metadata: MediaMetadata;
    sourceType: "upload" | "url" | "youtube";
    directUrl?: string;
    youtubeUrl?: string;
    youtubeInfo?: {
      title: string;
      thumbnail: string;
      duration: number;
      uploader: string;
    };
    fileId?: string;
    capabilities?: MediaCapabilities;
  } | null>(null);

  const activeAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
      }
    };
  }, []);

  const handlePasteClipboard = async () => {
    setClipboardNotice(null);
    setErrorMessage(null);

    if (!navigator.clipboard || !navigator.clipboard.readText) {
      setClipboardNotice(t.hero.clipboardUnsupported);
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setUrl(text.trim());
      } else {
        setClipboardNotice(t.hero.clipboardEmpty);
      }
    } catch {
      setClipboardNotice(t.hero.clipboardBlocked);
    }
  };

  const handleAnalyzeUrl = async (targetUrl?: string) => {
    const finalUrl = (targetUrl || url).trim();
    if (!finalUrl) {
      setErrorMessage(t.hero.emptyUrlError);
      return;
    }

    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    activeAbortControllerRef.current = controller;

    setErrorMessage(null);
    setClipboardNotice(null);
    setStudioState("analyzing");

    try {
      const data = await mediaApiClient.analyzeUrl(finalUrl, controller.signal);

      setLoadedMedia({
        metadata: data.metadata,
        sourceType: data.sourceType,
        directUrl: data.directUrl || finalUrl,
        youtubeUrl: data.youtubeUrl || (data.sourceType === "youtube" ? finalUrl : undefined),
        youtubeInfo: data.youtubeInfo,
        fileId: data.fileId,
        capabilities: data.capabilities,
      });
      setStudioState("ready");
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "ABORTED") {
        return;
      }
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to fetch YouTube video details."
      );
      setLoadedMedia(null);
      setStudioState("idle");
    } finally {
      activeAbortControllerRef.current = null;
    }
  };

  const handleReset = () => {
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
    }
    setLoadedMedia(null);
    setUrl("");
    setErrorMessage(null);
    setClipboardNotice(null);
    setStudioState("idle");
  };

  const isBusy = studioState === "analyzing";

  return (
    <div id="hero" className="w-full">
      {/* Hero Headline Area */}
      <section className="pt-12 pb-8 sm:pt-16 sm:pb-10 text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-50 border border-red-200/80 text-red-700 text-xs font-bold mb-6 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.hero.badge}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950 max-w-3xl mx-auto leading-tight">
            {t.hero.title}
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {t.hero.subtitle}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 font-semibold">
            <span className="flex items-center gap-1.5">
              <Music2 className="w-4 h-4 text-emerald-600" />
              {t.hero.pillMp3}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Video className="w-4 h-4 text-red-600" />
              {t.hero.pillMp4}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              {t.hero.pillFast}
            </span>
          </div>
        </div>
      </section>

      {/* Single-Field YouTube Converter Container */}
      <section id="tool-section" className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 -mt-2 mb-16">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-8 shadow-xl shadow-slate-100/80 space-y-5">
          <div className="space-y-3">
            <label
              htmlFor="media-url-input"
              className="text-xs font-bold text-slate-900 uppercase tracking-wider block"
            >
              {t.hero.inputLabel}
            </label>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1 flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
                  <Link2 className="w-4 h-4" />
                </div>

                <input
                  id="media-url-input"
                  type="url"
                  placeholder={t.hero.inputPlaceholder}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isBusy && url.trim()) {
                      handleAnalyzeUrl();
                    }
                  }}
                  disabled={isBusy}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50/50 pl-10 pr-24 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
                />

                <div className="absolute right-2 flex items-center gap-1">
                  {url && !isBusy && (
                    <button
                      type="button"
                      onClick={() => setUrl("")}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
                      title={t.hero.clearUrl}
                      aria-label={t.hero.clearUrl}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    disabled={isBusy}
                    className="px-2.5 py-1.5 text-xs font-bold text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-1 select-none cursor-pointer"
                    title={t.hero.pasteButton}
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    <span>{t.hero.pasteButton}</span>
                  </button>
                </div>
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={() => handleAnalyzeUrl()}
                isLoading={studioState === "analyzing"}
                disabled={isBusy || !url.trim()}
                leftIcon={<Sparkles className="w-4 h-4" />}
                aria-label={t.hero.convertAriaLabel}
                className="py-3.5 px-8 font-black text-sm tracking-wide bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-md shadow-red-600/25 border-0 rounded-2xl cursor-pointer"
              >
                {t.hero.convertButton}
              </Button>
            </div>
          </div>

          {studioState === "analyzing" && (
            <div className="pt-2" role="status" aria-live="polite">
              <ProgressBar
                indeterminate
                label={t.hero.analyzingLabel}
                sublabel={t.hero.analyzingSublabel}
              />
            </div>
          )}

          {clipboardNotice && (
            <Alert variant="info" title="Clipboard" onDismiss={() => setClipboardNotice(null)}>
              {clipboardNotice}
            </Alert>
          )}

          {errorMessage && (
            <Alert variant="error" title="Error" onDismiss={() => setErrorMessage(null)}>
              {errorMessage}
            </Alert>
          )}
        </div>

        {/* Result Area: Two Download Options (MP3 & MP4) */}
        {loadedMedia && (
          <div className="mt-8 animate-in fade-in duration-300">
            <YouTubeDownloadCard
              locale={locale}
              youtubeUrl={loadedMedia.youtubeUrl || url}
              title={loadedMedia.youtubeInfo?.title || loadedMedia.metadata.filename}
              thumbnail={loadedMedia.youtubeInfo?.thumbnail || ""}
              duration={loadedMedia.youtubeInfo?.duration || loadedMedia.metadata.duration || 0}
              uploader={loadedMedia.youtubeInfo?.uploader || "YouTube Channel"}
              onReset={handleReset}
            />
          </div>
        )}
      </section>
    </div>
  );
}
