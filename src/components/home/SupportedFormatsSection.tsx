"use client";

import React from "react";
import { Music2, Video } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Locale } from "@/lib/i18n/translations";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function SupportedFormatsSection({ locale: explicitLocale }: { locale?: Locale } = {}) {
  const { t } = useTranslation(explicitLocale);

  const options = [
    {
      name: t.formats.mp3Name,
      ext: ".mp3",
      quality: t.formats.mp3Quality,
      icon: <Music2 className="w-6 h-6 text-emerald-600" />,
      description: t.formats.mp3Desc,
      tag: t.formats.mp3Tag,
    },
    {
      name: t.formats.mp4Name,
      ext: ".mp4",
      quality: t.formats.mp4Quality,
      icon: <Video className="w-6 h-6 text-red-600" />,
      description: t.formats.mp4Desc,
      tag: t.formats.mp4Tag,
    },
  ];

  return (
    <section id="supported-formats" className="py-16 sm:py-20 border-b border-slate-200/60 bg-slate-50/60">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold text-red-600 uppercase tracking-wider block mb-2">
            {t.formats.badge}
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight">
            {t.formats.title}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            {t.formats.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {options.map((opt, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs hover:border-red-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 border border-slate-100">
                    {opt.icon}
                  </div>
                  <Badge variant="primary">{opt.tag}</Badge>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">{opt.name}</h3>
                <span className="text-xs font-mono font-semibold text-red-600 block mb-3">
                  {opt.quality} • {opt.ext}
                </span>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {opt.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
