"use client";

import React, { useState, useRef } from "react";
import { Layers, FileVideo, FileAudio } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { MetadataInspectorCard } from "@/components/media/MetadataInspectorCard";
import { MediaMetadata } from "@/lib/validation/schemas";

export function MetadataInspectorTool() {
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setErrorMessage(null);
    setMetadata(null);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to inspect media file.");
      }

      setMetadata(data.metadata);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Inspection failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadDemo = async (type: "audio" | "video") => {
    setErrorMessage(null);
    setMetadata(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/media/sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Demo generation failed.");

      setMetadata(data.metadata);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load sample.");
    } finally {
      setIsLoading(false);
    }
  };

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
            accept="audio/*,video/*"
            className="hidden"
          />

          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4">
            <Layers className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-1">
            Inspect Media Streams & Deep Metadata
          </h3>
          <p className="text-xs text-slate-500 max-w-md mb-5">
            Audit codec profiles, bitrates, audio channels, color spaces, and exact stream dimensions using pure FFprobe.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              Select File to Inspect
            </Button>

            <span className="text-xs font-semibold text-slate-400">or analyze sample:</span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleLoadDemo("video")}
              disabled={isLoading}
              leftIcon={<FileVideo className="w-3.5 h-3.5 text-indigo-600" />}
            >
              Analyze Video Sample
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleLoadDemo("audio")}
              disabled={isLoading}
              leftIcon={<FileAudio className="w-3.5 h-3.5 text-violet-600" />}
            >
              Analyze Audio Sample
            </Button>
          </div>

          {isLoading && (
            <div className="w-full max-w-xs mt-6">
              <ProgressBar indeterminate label="Probing streams with FFprobe..." />
            </div>
          )}
        </CardContent>
      </Card>

      {errorMessage && (
        <Alert variant="error" title="Inspection Error" onDismiss={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      {metadata && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <MetadataInspectorCard metadata={metadata} />
        </div>
      )}
    </div>
  );
}
