"use client";

import React from "react";
import Link from "next/link";
import { Layers, Mail } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";
import { Locale, SUPPORTED_LOCALES, getLocalePath } from "@/lib/i18n/translations";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function Footer({ locale: explicitLocale }: { locale?: Locale } = {}) {
  const { locale, basePath, t, localePath } = useTranslation(explicitLocale);
  const currentYear = 2026;

  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white text-slate-600">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-red-600 to-rose-600 text-white shadow-xs">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-base font-black text-slate-900">{SITE_CONFIG.name}</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md">
              {t.meta.description}
            </p>
            {/* Language quick links for SEO crawlers and users */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {SUPPORTED_LOCALES.map((item) => (
                <Link
                  key={item.code}
                  href={getLocalePath(item.code, basePath)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                    item.code === locale
                      ? "bg-red-50 border-red-200 text-red-700 font-bold"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:text-red-600"
                  }`}
                >
                  {item.flag} {item.nativeName}
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              {t.footer.quickLinks}
            </h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li>
                <Link href={localePath("/")} className="hover:text-red-600 transition-colors">
                  {t.footer.youtubeDownloader}
                </Link>
              </li>
              <li>
                <Link href={localePath("/how-it-works")} className="hover:text-red-600 transition-colors">
                  {t.footer.howItWorks}
                </Link>
              </li>
              <li>
                <Link href={localePath("/faq")} className="hover:text-red-600 transition-colors">
                  {t.footer.faq}
                </Link>
              </li>
              <li>
                <Link href={localePath("/privacy")} className="hover:text-red-600 transition-colors">
                  {t.footer.privacyPolicy}
                </Link>
              </li>
              <li>
                <Link href={localePath("/terms")} className="hover:text-red-600 transition-colors">
                  {t.footer.termsOfService}
                </Link>
              </li>
              <li>
                <Link href={localePath("/contact")} className="hover:text-red-600 transition-colors">
                  {t.footer.contact}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            © {currentYear} {SITE_CONFIG.name}. {t.footer.copyrightTagline}
          </p>
          <div className="flex flex-wrap items-center gap-5 text-slate-500 font-medium">
            <Link href={localePath("/terms")} className="hover:text-red-600 transition-colors">
              {t.footer.termsOfService}
            </Link>
            <Link href={localePath("/privacy")} className="hover:text-red-600 transition-colors">
              {t.footer.privacyPolicy}
            </Link>
            <Link
              href={localePath("/contact")}
              className="hover:text-red-600 transition-colors flex items-center gap-1"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{t.footer.contact}</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
