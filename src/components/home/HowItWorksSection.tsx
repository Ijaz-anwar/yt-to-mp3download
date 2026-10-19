"use client";

import React from "react";
import { Link2, Sparkles, Download, CheckCircle2 } from "lucide-react";
import { Locale } from "@/lib/i18n/translations";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function HowItWorksSection({ locale: explicitLocale }: { locale?: Locale } = {}) {
  const { t } = useTranslation(explicitLocale);

  const icons = [
    <Link2 key="0" className="w-5 h-5 text-red-600" />,
    <Sparkles key="1" className="w-5 h-5 text-red-600" />,
    <Download key="2" className="w-5 h-5 text-red-600" />,
  ];

  return (
    <section id="how-it-works" className="py-16 sm:py-20 border-b border-slate-200/60 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <span className="text-xs font-bold text-red-600 uppercase tracking-wider block mb-2">
            {t.howItWorks.badge}
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight">
            {t.howItWorks.title}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            {t.howItWorks.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {t.howItWorks.steps.map((item, idx) => (
            <div
              key={idx}
              className="relative rounded-2xl border border-slate-200/90 bg-slate-50/50 p-7 shadow-xs hover:border-red-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 border border-red-100/80 shadow-2xs">
                    {icons[idx]}
                  </div>
                  <span className="text-2xl font-black text-slate-200 font-mono">
                    {`0${idx + 1}`}
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
                <span>{t.howItWorks.fastEasy}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
