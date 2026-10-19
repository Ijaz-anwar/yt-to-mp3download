"use client";

import React from "react";
import { Zap, Music2, Video, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Locale } from "@/lib/i18n/translations";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function WhyChooseSection({ locale: explicitLocale }: { locale?: Locale } = {}) {
  const { t } = useTranslation(explicitLocale);

  const icons = [
    <Zap key="0" className="w-6 h-6 text-red-600" />,
    <Music2 key="1" className="w-6 h-6 text-emerald-600" />,
    <Video key="2" className="w-6 h-6 text-indigo-600" />,
    <ShieldCheck key="3" className="w-6 h-6 text-amber-600" />,
  ];

  return (
    <section id="why-choose" className="py-16 sm:py-20 border-b border-slate-200/60 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <span className="text-xs font-bold text-red-600 uppercase tracking-wider block mb-2">
            {t.whyChoose.badge}
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight">
            {t.whyChoose.title}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            {t.whyChoose.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {t.whyChoose.items.map((item, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-6 shadow-xs hover:border-red-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-slate-200/80 mb-5 shadow-xs">
                  {icons[idx]}
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
                <span>{t.whyChoose.readyBadge}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
