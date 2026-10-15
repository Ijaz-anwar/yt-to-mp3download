import React from "react";
import { Link2, Sliders, Download, CheckCircle2 } from "lucide-react";

export function HowItWorksSection() {
  const steps = [
    {
      step: "01",
      icon: <Link2 className="w-5 h-5 text-indigo-600" />,
      title: "Input URL or Upload File",
      description:
        "Paste an authorized direct media stream link or drag and drop a local audio/video file from your computer.",
    },
    {
      step: "02",
      icon: <Sliders className="w-5 h-5 text-indigo-600" />,
      title: "Select Format & Quality",
      description:
        "Pick your target container (MP4, WebM, MP3, M4A, WAV) and adjust video resolution or studio audio bitrates up to 320kbps.",
    },
    {
      step: "03",
      icon: <Download className="w-5 h-5 text-indigo-600" />,
      title: "Download Ready Media",
      description:
        "Preview playback in your browser and download the freshly transcoded file directly to your device with zero ads.",
    },
  ];

  return (
    <section id="how-it-works" className="py-16 sm:py-20 border-b border-slate-200/60 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block mb-2">
            Simple 3-Step Process
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight">
            How MediaNest Works
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            Process and optimize your media effortlessly without software installations or cloud accounts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((item, idx) => (
            <div
              key={idx}
              className="relative rounded-2xl border border-slate-200/90 bg-slate-50/50 p-7 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100/80 shadow-2xs">
                    {item.icon}
                  </div>
                  <span className="text-2xl font-black text-indigo-100 font-mono">
                    {item.step}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Instant Local Verification</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
