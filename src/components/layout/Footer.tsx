import React from "react";
import { Layers, ShieldCheck, Mail } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";

export function Footer() {
  const currentYear = 2026;

  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white text-slate-600">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-xs">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-base font-black text-slate-900">{SITE_CONFIG.name}</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md">
              {SITE_CONFIG.description}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500 pt-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Engineered for authorized local media files and direct permitted streams.
              </span>
            </div>
          </div>

          {/* Supported Formats */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Supported Formats
            </h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li>
                <span className="font-semibold text-slate-700">Audio:</span> MP3, WAV, AAC,
                OGG, FLAC, M4A
              </li>
              <li>
                <span className="font-semibold text-slate-700">Video:</span> MP4 (H.264),
                WebM (VP9), MKV
              </li>
              <li>
                <span className="font-semibold text-slate-700">Quality:</span> 128k to 320kbps
                CBR/VBR
              </li>
              <li>
                <span className="font-semibold text-slate-700">Scaling:</span> 480p, 720p,
                1080p Full HD
              </li>
            </ul>
          </div>

          {/* Quick Links & Legal */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Navigation & Policies
            </h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li>
                <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#supported-formats" className="hover:text-indigo-600 transition-colors">
                  Supported Codecs
                </a>
              </li>
              <li>
                <a href="#why-choose" className="hover:text-indigo-600 transition-colors">
                  Privacy & Staging Security
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-indigo-600 transition-colors">
                  Frequently Asked Questions
                </a>
              </li>
              <li>
                <a href="/api/health" target="_blank" className="hover:text-indigo-600 transition-colors">
                  API & Engine Status
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            © {currentYear} {SITE_CONFIG.name}. Built with strict data privacy and verified local FFmpeg.
          </p>
          <div className="flex flex-wrap items-center gap-5 text-slate-500 font-medium">
            <span className="text-[11px] text-slate-400">
              No DRM Bypasses • Authorized Media Only
            </span>
            <a href="#faq" className="hover:text-indigo-600 transition-colors">
              Terms & Compliance
            </a>
            <a href="#why-choose" className="hover:text-indigo-600 transition-colors">
              Privacy Policy
            </a>
            <a
              href="mailto:contact@medianest.local"
              className="hover:text-indigo-600 transition-colors flex items-center gap-1"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Contact</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
