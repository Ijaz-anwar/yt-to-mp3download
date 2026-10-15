import React from "react";
import { ShieldCheck, Lock, Cpu, CheckCircle2, EyeOff } from "lucide-react";

export function WhyChooseSection() {
  const highlights = [
    {
      icon: <Cpu className="w-6 h-6 text-indigo-600" />,
      title: "Native FFmpeg Processing",
      description:
        "Every conversion is executed using a verified local FFmpeg binary. We never fabricate file sizes, bitrates, or fake progress indicators.",
    },
    {
      icon: <Lock className="w-6 h-6 text-emerald-600" />,
      title: "Automatic Ephemeral Staging",
      description:
        "Your uploaded and converted files remain strictly in ephemeral server staging and are automatically purged after 30-60 minutes.",
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-blue-600" />,
      title: "SSRF Network Security Shield",
      description:
        "Remote stream fetching strictly filters dangerous internal IP ranges, loopback addresses, and cloud metadata endpoints to prevent server-side attacks.",
    },
    {
      icon: <EyeOff className="w-6 h-6 text-violet-600" />,
      title: "Zero Tracking & No User Accounts",
      description:
        "No signup forms, no cookies tracking your media consumption, and zero third-party telemetry. We do not sell or inspect user files.",
    },
  ];

  return (
    <section id="why-choose" className="py-16 sm:py-20 border-b border-slate-200/60 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block mb-2">
            Built on Trust & Integrity
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight">
            Why Choose MediaNest?
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            A production-grade media utility engineered for privacy, accuracy, and real transcoding performance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {highlights.map((item, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-6 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-slate-200/80 mb-5 shadow-xs">
                  {item.icon}
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Verified Architecture</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
