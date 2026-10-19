"use client";

import React from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroMediaStudio } from "@/components/home/HeroMediaStudio";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { SupportedFormatsSection } from "@/components/home/SupportedFormatsSection";
import { WhyChooseSection } from "@/components/home/WhyChooseSection";
import { FaqSection } from "@/components/home/FaqSection";
import { Locale } from "@/lib/i18n/translations";

export function MediaNestApp({ locale }: { locale?: Locale } = {}) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header locale={locale} />

      <main className="flex-1">
        <HeroMediaStudio locale={locale} />
        <HowItWorksSection locale={locale} />
        <SupportedFormatsSection locale={locale} />
        <WhyChooseSection locale={locale} />
        <FaqSection locale={locale} />
      </main>

      <Footer locale={locale} />
    </div>
  );
}
