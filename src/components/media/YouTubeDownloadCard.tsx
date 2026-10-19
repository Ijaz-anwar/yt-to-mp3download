"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Music2,
  Video,
  Download,
  CheckCircle2,
  Clock,
  RotateCcw,
  Loader2,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { formatDuration, formatBytes } from "@/lib/utils/format";
import { mediaApiClient, ApiClientError } from "@/lib/api/media-client";
import { Locale } from "@/lib/i18n/translations";
import { useTranslation } from "@/lib/i18n/useTranslation";

export interface YouTubeDownloadCardProps {
  locale?: Locale;
  youtubeUrl: string;
  title: string;
  thumbnail: string;
  duration: number;
  uploader: string;
  onReset: () => void;
}

export type DownloadState = "idle" | "converting" | "completed" | "failed";

export function YouTubeDownloadCard({
  locale: explicitLocale,
  youtubeUrl,
  title,
  thumbnail,
  duration,
  uploader,
  onReset,
}: YouTubeDownloadCardProps) {
  const { t } = useTranslation(explicitLocale);
  const [activeFormat, setActiveFormat] = useState<"mp3" | "mp4" | null>(null);
  const [state, setState] = useState<DownloadState>("idle");
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState<string | null>(null);
  const [downloadSize, setDownloadSize] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const triggerBrowserDownload = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleStartDownload = async (format: "mp3" | "mp4") => {
    if (state === "converting") return;

    setActiveFormat(format);
    setState("converting");
    setProgress(5);
    setErrorMessage(null);
    setDownloadUrl(null);

    try {
      const jobRes = await mediaApiClient.createJob({
        youtubeUrl,
        targetFormat: format,
        audioBitrate: "320k",
        videoResolution: "original",
      });

      const jobId = jobRes.job.id;

      let attempts = 0;
      const maxAttempts = 600; // 15-minute max timeout for long videos

      pollIntervalRef.current = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setState("failed");
          setErrorMessage("Download timed out. Please try again.");
          return;
        }

        try {
          const statusRes = await mediaApiClient.getJob(jobId);
          const job = statusRes.job;

          if (job.status === "processing") {
            setProgress(Math.max(10, Math.min(95, job.progress)));
          } else if (job.status === "completed") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setProgress(100);
            setState("completed");

            const finalUrl = mediaApiClient.getDownloadUrl(jobId);
            const finalName = job.outputFilename || `${title}.${format}`;

            setDownloadUrl(finalUrl);
            setDownloadFilename(finalName);
            setDownloadSize(job.outputSize || null);

            triggerBrowserDownload(finalUrl, finalName);
          } else if (job.status === "failed") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setState("failed");
            setErrorMessage(job.error || "Failed to download and convert the requested format.");
          }
        } catch (pollErr) {
          if (attempts > 5 && pollErr instanceof ApiClientError && pollErr.statusCode === 404) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setState("failed");
            setErrorMessage("Conversion job expired or was purged.");
          }
        }
      }, 1500);
    } catch (err) {
      setState("failed");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to initiate download job."
      );
    }
  };

  const isConverting = state === "converting";

  return (
    <div className="w-full rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xl shadow-slate-100/80 space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {t.downloadCard.readyBadge}
          </span>
        </div>
        <button
          type="button"
          onClick={onReset}
          disabled={isConverting}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t.downloadCard.convertAnother}</span>
        </button>
      </div>

      {/* Video Information Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        <div className="md:col-span-5 relative group overflow-hidden rounded-2xl shadow-sm border border-slate-200 aspect-video bg-slate-950 flex items-center justify-center">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnail}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <Video className="w-12 h-12 text-slate-600" />
          )}

          {duration > 0 && (
            <div className="absolute bottom-2.5 right-2.5 bg-black/85 backdrop-blur-xs text-white text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
              <Clock className="w-3 h-3 text-white/80" />
              <span>{formatDuration(duration)}</span>
            </div>
          )}

          <div className="absolute top-2.5 left-2.5 bg-red-600/90 backdrop-blur-xs text-white text-[11px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            YouTube
          </div>
        </div>

        <div className="md:col-span-7 space-y-2.5">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug line-clamp-2">
            {title}
          </h2>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
              {uploader || "YouTube Channel"}
            </span>
            <span>•</span>
            <span>
              {t.downloadCard.durationLabel}: {formatDuration(duration)}
            </span>
          </div>

          <p className="text-xs text-slate-500 pt-1 leading-relaxed">
            {t.downloadCard.selectFormatHint}
          </p>
        </div>
      </div>

      {/* The TWO Action Buttons (MP3 & MP4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
        {/* Button 1: Download MP3 */}
        <button
          type="button"
          onClick={() => handleStartDownload("mp3")}
          disabled={isConverting}
          className={`relative overflow-hidden group flex items-center justify-between p-4 rounded-2xl font-bold transition-all duration-200 border text-left ${
            activeFormat === "mp3" && isConverting
              ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/25 ring-2 ring-emerald-500/30"
              : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border-emerald-600/90 shadow-md shadow-emerald-600/20 hover:scale-[1.01] active:scale-[0.99]"
          } disabled:opacity-60 disabled:hover:scale-100 cursor-pointer`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0 shadow-inner">
              {activeFormat === "mp3" && isConverting ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Music2 className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>{t.downloadCard.downloadMp3}</span>
                <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-white/25 text-white">
                  {t.downloadCard.audioBadge}
                </span>
              </div>
              <div className="text-xs text-emerald-100 font-semibold mt-0.5">
                {activeFormat === "mp3" && isConverting
                  ? `${t.downloadCard.convertingAudio} ${progress}%`
                  : t.downloadCard.mp3Quality}
              </div>
            </div>
          </div>
          <Download className="w-5 h-5 text-emerald-100 group-hover:translate-y-0.5 transition-transform shrink-0" />
        </button>

        {/* Button 2: Download MP4 */}
        <button
          type="button"
          onClick={() => handleStartDownload("mp4")}
          disabled={isConverting}
          className={`relative overflow-hidden group flex items-center justify-between p-4 rounded-2xl font-bold transition-all duration-200 border text-left ${
            activeFormat === "mp4" && isConverting
              ? "bg-red-600 text-white border-red-600 shadow-md shadow-red-600/25 ring-2 ring-red-500/30"
              : "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border-red-600/90 shadow-md shadow-red-600/20 hover:scale-[1.01] active:scale-[0.99]"
          } disabled:opacity-60 disabled:hover:scale-100 cursor-pointer`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0 shadow-inner">
              {activeFormat === "mp4" && isConverting ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Video className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>{t.downloadCard.downloadMp4}</span>
                <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-white/25 text-white">
                  {t.downloadCard.videoBadge}
                </span>
              </div>
              <div className="text-xs text-red-100 font-semibold mt-0.5">
                {activeFormat === "mp4" && isConverting
                  ? `${t.downloadCard.downloadingVideo} ${progress}%`
                  : t.downloadCard.mp4Quality}
              </div>
            </div>
          </div>
          <Download className="w-5 h-5 text-red-100 group-hover:translate-y-0.5 transition-transform shrink-0" />
        </button>
      </div>

      {/* Live Conversion Progress Bar */}
      {isConverting && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-red-600" />
              <span>
                {activeFormat === "mp3"
                  ? t.downloadCard.extractingMp3Progress
                  : t.downloadCard.mergingMp4Progress}
              </span>
            </span>
            <span className="text-red-600 font-black text-sm">{progress}%</span>
          </div>

          <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden p-0.5 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                activeFormat === "mp3"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                  : "bg-gradient-to-r from-red-500 to-rose-500"
              }`}
              style={{ width: `${Math.max(5, progress)}%` }}
            />
          </div>
        </div>
      )}

      {/* Completed Notification */}
      {state === "completed" && downloadUrl && (
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-3 animate-in zoom-in-95 duration-200 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm sm:text-base font-extrabold text-emerald-950">
                  {activeFormat?.toUpperCase()} — {t.downloadCard.downloadStartedTitle}
                </div>
                <div className="text-xs text-emerald-800">
                  {downloadFilename} {downloadSize ? `(${formatBytes(downloadSize)})` : ""}
                </div>
              </div>
            </div>
            <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-emerald-200/60 text-xs">
            <span className="text-slate-600">
              {t.downloadCard.manualSavePrompt}{" "}
              <a
                href={downloadUrl}
                download={downloadFilename || "download"}
                className="text-emerald-700 font-bold underline hover:text-emerald-900 inline-flex items-center gap-1"
              >
                <span>{t.downloadCard.manualSaveLink}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </span>

            <button
              type="button"
              onClick={onReset}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
            >
              {t.downloadCard.convertAnotherVideo}
            </button>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {state === "failed" && errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{t.downloadCard.downloadErrorTitle}</span>
          </div>
          <p className="text-xs text-red-700">{errorMessage}</p>
          <div className="pt-1 flex gap-2">
            <button
              type="button"
              onClick={() => handleStartDownload(activeFormat || "mp3")}
              className="px-3 py-1.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors"
            >
              {t.downloadCard.retryButton}
            </button>
            <button
              type="button"
              onClick={onReset}
              className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-300 transition-colors"
            >
              {t.downloadCard.cancelButton}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
