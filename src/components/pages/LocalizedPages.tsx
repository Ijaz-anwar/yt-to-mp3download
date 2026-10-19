import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { MediaNestApp } from "@/components/MediaNestApp";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_CONFIG, CANONICAL_ORIGIN, getCanonicalUrl } from "@/config/site";
import {
  Locale,
  TRANSLATIONS,
  getLocalePath,
} from "@/lib/i18n/translations";
import {
  Link2,
  Sparkles,
  Download,
  ArrowRight,
  HelpCircle,
  ShieldCheck,
  Clock,
  Lock,
  FileCheck,
  AlertTriangle,
  Mail,
} from "lucide-react";

export function buildLanguageAlternates(subPath = "/") {
  return {
    en: getCanonicalUrl(getLocalePath("en", subPath)),
    es: getCanonicalUrl(getLocalePath("es", subPath)),
    fr: getCanonicalUrl(getLocalePath("fr", subPath)),
    de: getCanonicalUrl(getLocalePath("de", subPath)),
    pt: getCanonicalUrl(getLocalePath("pt", subPath)),
    "x-default": getCanonicalUrl(getLocalePath("en", subPath)),
  };
}

export function getLocalizedPageMetadata(
  locale: Locale,
  page: "home" | "how-it-works" | "faq" | "privacy" | "terms" | "contact"
): Metadata {
  const t = TRANSLATIONS[locale];
  const subPath = page === "home" ? "/" : `/${page}`;
  const canonicalUrl = getCanonicalUrl(getLocalePath(locale, subPath));

  const titles: Record<typeof page, string> = {
    home: t.meta.title,
    "how-it-works": `${t.howItWorks.title} | ${SITE_CONFIG.name}`,
    faq: `${t.faq.title} | ${SITE_CONFIG.name}`,
    privacy: `${t.privacy.title} | ${SITE_CONFIG.name}`,
    terms: `${t.terms.title} | ${SITE_CONFIG.name}`,
    contact: `${t.contact.title} | ${SITE_CONFIG.name}`,
  };

  const descriptions: Record<typeof page, string> = {
    home: t.meta.description,
    "how-it-works": t.howItWorks.subtitle,
    faq: t.faq.subtitle,
    privacy: t.privacy.subtitle,
    terms: t.terms.subtitle,
    contact: t.contact.subtitle,
  };

  return {
    title: {
      absolute: titles[page],
    },
    description: descriptions[page],
    alternates: {
      canonical: canonicalUrl,
      languages: buildLanguageAlternates(subPath),
    },
    openGraph: {
      title: titles[page],
      description: descriptions[page],
      url: canonicalUrl,
    },
  };
}

export function LocalizedHomePage({ locale }: { locale: Locale }) {
  const t = TRANSLATIONS[locale];
  const pageUrl = getCanonicalUrl(getLocalePath(locale, "/"));

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_CONFIG.name,
    url: pageUrl,
    inLanguage: locale,
    description: t.meta.description,
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_CONFIG.name,
    url: CANONICAL_ORIGIN,
    logo: `${CANONICAL_ORIGIN}/icon.svg`,
    description: t.meta.description,
  };

  return (
    <>
      <JsonLd data={websiteSchema} />
      <JsonLd data={organizationSchema} />
      <MediaNestApp locale={locale} />
    </>
  );
}

export function LocalizedHowItWorksPage({ locale }: { locale: Locale }) {
  const t = TRANSLATIONS[locale];
  const icons = [
    <Link2 key="0" className="w-6 h-6 text-red-600" />,
    <Sparkles key="1" className="w-6 h-6 text-red-600" />,
    <Download key="2" className="w-6 h-6 text-emerald-600" />,
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header locale={locale} />

      <main className="flex-1 pb-16">
        <Breadcrumbs items={[{ label: t.header.howItWorks }]} />

        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              {t.howItWorks.title}
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
              {t.howItWorks.subtitle}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6 mb-12">
          {t.howItWorks.steps.map((stage, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs"
            >
              <div className="flex items-start gap-5">
                <div className="p-3 rounded-2xl bg-red-50 border border-red-100 shrink-0">
                  {icons[idx]}
                </div>
                <div>
                  <span className="text-xs font-bold text-red-600 uppercase tracking-wider">
                    {`0${idx + 1}`}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mt-0.5">{stage.title}</h2>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{stage.description}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-900 rounded-3xl p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-xl font-black">{t.howItWorks.ctaTitle}</h2>
              <p className="text-sm text-slate-300 mt-1">
                {t.howItWorks.ctaSubtitle}
              </p>
            </div>
            <Link
              href={getLocalePath(locale, "/")}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-colors shrink-0"
            >
              <span>{t.howItWorks.ctaButton}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}

export function LocalizedFaqPage({ locale }: { locale: Locale }) {
  const t = TRANSLATIONS[locale];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: t.faq.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <JsonLd data={faqSchema} />
      <Header locale={locale} />

      <main className="flex-1 pb-16">
        <Breadcrumbs items={[{ label: t.faq.title }]} />

        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200/60 mb-4">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{t.faq.badge}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              {t.faq.title}
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
              {t.faq.subtitle}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-4 mb-12">
          {t.faq.items.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs"
            >
              <h2 className="text-base font-bold text-slate-900 mb-2">{faq.question}</h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </section>

        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 sm:p-8 rounded-2xl bg-slate-900 text-white">
            <div>
              <h3 className="text-lg font-bold">{t.faq.stillHaveQuestions}</h3>
              <p className="text-xs sm:text-sm text-slate-300">
                {t.faq.reachOutText}
              </p>
            </div>
            <Link
              href={getLocalePath(locale, "/contact")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-colors"
            >
              <span>{t.faq.contactUsBtn}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}

export function LocalizedPrivacyPage({ locale }: { locale: Locale }) {
  const t = TRANSLATIONS[locale];
  const icons = [
    <ShieldCheck key="0" className="w-5 h-5 text-emerald-600" />,
    <Clock key="1" className="w-5 h-5 text-red-600" />,
    <Lock key="2" className="w-5 h-5 text-indigo-600" />,
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header locale={locale} />

      <main className="flex-1 pb-16">
        <Breadcrumbs items={[{ label: t.privacy.title }]} />

        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              {t.privacy.title}
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
              {t.privacy.subtitle}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
          {t.privacy.sections.map((sec, idx) => (
            <div
              key={idx}
              className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-3"
            >
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {icons[idx]}
                <span>{sec.title}</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {sec.body}
              </p>
            </div>
          ))}
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}

export function LocalizedTermsPage({ locale }: { locale: Locale }) {
  const t = TRANSLATIONS[locale];
  const icons = [
    <FileCheck key="0" className="w-5 h-5 text-red-600" />,
    <AlertTriangle key="1" className="w-5 h-5 text-amber-600" />,
    <Mail key="2" className="w-5 h-5 text-indigo-600" />,
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header locale={locale} />

      <main className="flex-1 pb-16">
        <Breadcrumbs items={[{ label: t.terms.title }]} />

        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              {t.terms.title}
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
              {t.terms.subtitle}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
          {t.terms.sections.map((sec, idx) => (
            <div
              key={idx}
              className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-3"
            >
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {icons[idx]}
                <span>{sec.title}</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {sec.body}
              </p>
            </div>
          ))}
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}

export function LocalizedContactPage({ locale }: { locale: Locale }) {
  const t = TRANSLATIONS[locale];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header locale={locale} />

      <main className="flex-1 pb-16">
        <Breadcrumbs items={[{ label: t.contact.title }]} />

        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              {t.contact.title}
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
              {t.contact.subtitle}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="p-3 rounded-2xl bg-red-50 border border-red-100 w-fit">
              <Mail className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">{t.contact.cardTitle}</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {t.contact.cardBody}
            </p>
            <div>
              <a
                href="mailto:support@medianest.app"
                className="inline-flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700 transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span>support@medianest.app</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
