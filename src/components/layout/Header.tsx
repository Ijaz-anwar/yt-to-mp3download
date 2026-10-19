"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Layers, Menu, X, Globe, ChevronDown, Check } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";
import { SUPPORTED_LOCALES, Locale, getLocalePath } from "@/lib/i18n/translations";
import { useTranslation } from "@/lib/i18n/useTranslation";

export interface HeaderProps {
  locale?: Locale;
  activeTab?: string;
  onNavigateSection?: (sectionId: "home" | "video" | "audio" | "how-it-works" | "faq") => void;
}

export function Header(props?: HeaderProps) {
  const { locale, basePath, t, localePath } = useTranslation(props?.locale);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement | null>(null);

  const currentLangObj =
    SUPPORTED_LOCALES.find((l) => l.code === locale) || SUPPORTED_LOCALES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        langDropdownRef.current &&
        !langDropdownRef.current.contains(event.target as Node)
      ) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navItems = [
    { id: "home", label: t.header.home, href: localePath("/") },
    { id: "how-it-works", label: t.header.howItWorks, href: localePath("/how-it-works") },
    { id: "faq", label: t.header.faq, href: localePath("/faq") },
    { id: "contact", label: t.header.contact, href: localePath("/contact") },
  ] as const;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* Brand Logo & Wordmark */}
        <div className="flex items-center gap-3">
          <Link
            href={localePath("/")}
            className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 rounded-xl p-1"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-red-600 to-rose-600 text-white shadow-sm shadow-red-600/30 group-hover:scale-105 transition-transform duration-200">
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-slate-900">
                {SITE_CONFIG.name}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:block">
                {t.header.subtitle}
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-3">
          <nav
            aria-label="Main Navigation"
            className="flex items-center gap-1.5"
          >
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                role="button"
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-red-600 hover:bg-slate-50 rounded-xl transition-all"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Language Switcher Dropdown */}
          <div className="relative" ref={langDropdownRef}>
            <button
              type="button"
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              aria-expanded={langMenuOpen}
              aria-label={t.header.languageLabel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-red-600" />
              <span>{currentLangObj.flag}</span>
              <span>{currentLangObj.label}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  langMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {langMenuOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-slate-200 bg-white py-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                {SUPPORTED_LOCALES.map((item) => {
                  const active = item.code === locale;
                  return (
                    <Link
                      key={item.code}
                      href={getLocalePath(item.code, basePath)}
                      onClick={() => setLangMenuOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2 text-xs font-semibold transition-colors ${
                        active
                          ? "bg-red-50 text-red-600 font-bold"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{item.flag}</span>
                        <span>{item.nativeName}</span>
                      </span>
                      {active && <Check className="w-3.5 h-3.5 text-red-600" />}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Controls (Language + Menu Toggle) */}
        <div className="flex lg:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
            className="p-2 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200/80 bg-white px-4 py-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                role="button"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3.5 py-2.5 text-sm font-bold text-slate-700 hover:text-red-600 hover:bg-slate-50 rounded-xl transition-all"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Mobile Language Selector */}
          <div className="pt-3 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-2">
              {t.header.languageLabel}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SUPPORTED_LOCALES.map((item) => {
                const active = item.code === locale;
                return (
                  <Link
                    key={item.code}
                    href={getLocalePath(item.code, basePath)}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                      active
                        ? "bg-red-50 border-red-200 text-red-700"
                        : "bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>{item.flag}</span>
                    <span>{item.nativeName}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
