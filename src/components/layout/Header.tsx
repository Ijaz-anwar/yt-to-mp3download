"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Layers, Menu, X, ArrowUpRight, ShieldCheck } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";
import { Badge } from "@/components/ui/Badge";

export interface HeaderProps {
  activeTab?: string;
  onNavigateSection?: (sectionId: "home" | "video" | "audio" | "how-it-works" | "faq") => void;
}

export function Header({ onNavigateSection }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: "home", label: "Home", href: "#hero" },
    { id: "video", label: "Video Downloader", href: "#tool-section" },
    { id: "audio", label: "Audio Converter", href: "#tool-section" },
    { id: "how-it-works", label: "How It Works", href: "#how-it-works" },
    { id: "faq", label: "FAQ", href: "#faq" },
  ] as const;

  const handleItemClick = (id: "home" | "video" | "audio" | "how-it-works" | "faq", href: string) => {
    if (onNavigateSection) {
      onNavigateSection(id);
    }
    setMobileMenuOpen(false);

    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* Brand Logo & Wordmark */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            onClick={() => handleItemClick("home", "#hero")}
            className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-xl p-1"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-600 text-white shadow-sm shadow-indigo-600/30 group-hover:scale-105 transition-transform duration-200">
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-slate-900">
                  {SITE_CONFIG.name}
                </span>
                <Badge variant="primary" size="sm">
                  v1.0
                </Badge>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:block">
                Media Transcoder & Stream Utility
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav
          aria-label="Main Navigation"
          className="hidden lg:flex items-center gap-1.5"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id, item.href)}
              type="button"
              className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all"
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right Action / System Status */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/api/health"
            target="_blank"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl text-emerald-800 bg-emerald-50/80 border border-emerald-200/80 hover:bg-emerald-100 transition-colors shadow-2xs"
            title="System Engine & Status"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Engine Ready</span>
          </Link>

          <button
            onClick={() => handleItemClick("video", "#tool-section")}
            className="hidden xl:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-indigo-600 text-white transition-all shadow-xs"
          >
            <span>Start Converting</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile Menu Toggle Button */}
        <div className="flex lg:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
            className="p-2 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-200 bg-white px-4 py-4 space-y-2 shadow-lg animate-in slide-in-from-top-2 duration-150">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id, item.href)}
              type="button"
              className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors"
            >
              {item.label}
            </button>
          ))}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between px-2">
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Verified Local FFmpeg
            </span>
            <Link
              href="/api/health"
              className="text-xs font-bold text-emerald-600 hover:underline"
            >
              Status Check
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
