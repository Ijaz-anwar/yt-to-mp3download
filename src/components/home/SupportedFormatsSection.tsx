import React from "react";
import { Film, Music2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export function SupportedFormatsSection() {
  const videoFormats = [
    {
      name: "MP4 Video",
      ext: ".mp4",
      codec: "H.264 / AAC",
      useCase: "Universal compatibility across all Apple, Android, Windows, and Web devices.",
      tag: "Most Popular",
    },
    {
      name: "WebM Video",
      ext: ".webm",
      codec: "VP9 / Opus",
      useCase: "Modern open web format with superior compression efficiency for browser streaming.",
      tag: "Web Optimized",
    },
  ];

  const audioFormats = [
    {
      name: "MP3 Audio",
      ext: ".mp3",
      codec: "LAME CBR/VBR",
      useCase: "Industry standard audio container with bitrate presets ranging from 128k to 320kbps.",
      tag: "Universal Audio",
    },
    {
      name: "M4A Audio",
      ext: ".m4a",
      codec: "AAC LC",
      useCase: "High quality audio compression optimal for Apple Podcasts, iTunes, and mobile playback.",
      tag: "High Efficiency",
    },
    {
      name: "WAV Lossless",
      ext: ".wav",
      codec: "PCM 16-Bit",
      useCase: "Uncompressed audio standard for music production, editing, and studio archives.",
      tag: "Studio Master",
    },
    {
      name: "FLAC Master",
      ext: ".flac",
      codec: "FLAC Lossless",
      useCase: "Bit-for-bit lossless master audio compressed to save up to 50% space with zero loss.",
      tag: "Audiophile",
    },
  ];

  return (
    <section id="supported-formats" className="py-16 sm:py-20 border-b border-slate-200/60 bg-slate-50/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block mb-2">
            Containers & Codecs
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight">
            Supported Media Formats
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            Engineered with industry-standard codecs for maximum compatibility and pristine fidelity.
          </p>
        </div>

        {/* Video formats */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Film className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Video Containers & Codecs
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videoFormats.map((fmt, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-bold text-slate-900">{fmt.name}</span>
                    <Badge variant="primary">{fmt.tag}</Badge>
                  </div>
                  <span className="text-xs font-mono font-semibold text-indigo-600 block mb-2">
                    {fmt.codec} • {fmt.ext}
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">{fmt.useCase}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audio formats */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Music2 className="w-4 h-4 text-violet-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Audio Containers & Codecs
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {audioFormats.map((fmt, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-900">{fmt.name}</span>
                    <Badge variant="neutral" size="sm">
                      {fmt.ext}
                    </Badge>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-slate-500 block mb-2">
                    {fmt.codec}
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">{fmt.useCase}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
