"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "What media sources are supported by MediaNest?",
      answer:
        "MediaNest supports authorized local media files uploaded from your device (MP4, WebM, MKV, MP3, WAV, AAC, FLAC, OGG) as well as direct HTTP/HTTPS media streams and public feeds (such as podcast episodes and open Creative Commons media) where you have permission from the rights holder.",
    },
    {
      question: "Does MediaNest support YouTube or DRM-protected streams?",
      answer:
        "No. In strict accordance with applicable terms and intellectual property standards, MediaNest does not implement DRM circumvention, access-control bypasses, or unauthorized YouTube extraction. Only direct authorized files and permitted public media streams are processed.",
    },
    {
      question: "How does the in-browser preview player work?",
      answer:
        "MediaNest leverages HTML5 native video and audio elements with HTTP Range header streaming. Once transcoding completes, you can immediately preview and seek through the media file right inside your browser before downloading it.",
    },
    {
      question: "What are the file size limits?",
      answer:
        "Local file uploads are supported up to 250 MB per file, and remote direct media streams are capped at 200 MB. These limits ensure rapid transcoding response times without exhausting system memory.",
    },
    {
      question: "Are my uploaded or converted files stored permanently?",
      answer:
        "No. All media assets reside exclusively in temporary staging storage. Files are automatically purged from the server after 30 to 60 minutes. We do not maintain user accounts or persistent database records of your processed files.",
    },
    {
      question: "Can I extract only the audio track from a video file?",
      answer:
        "Yes! You can either select an audio format (like MP3, M4A, WAV, or FLAC) in the media converter options or switch to the dedicated 'Audio Converter' tool. The video frames are automatically stripped (-vn) while preserving high audio fidelity.",
    },
  ];

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-16 sm:py-20 bg-slate-50/60">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block mb-2">
            Got Questions?
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            Everything you need to know about formats, privacy, and authorized usage.
          </p>
        </div>

        <div className="space-y-3.5">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            const buttonId = `faq-btn-${index}`;
            const panelId = `faq-panel-${index}`;

            return (
              <div
                key={index}
                className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden transition-all duration-200"
              >
                <button
                  id={buttonId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggleFaq(index)}
                  type="button"
                  className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-slate-50/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                >
                  <span className="text-sm sm:text-base font-bold text-slate-900 pr-4">
                    {faq.question}
                  </span>
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-transform duration-200 ${
                      isOpen ? "rotate-180 bg-indigo-50 text-indigo-600" : ""
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className="px-5 pb-5 sm:px-6 sm:pb-6 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100/80 pt-4 bg-slate-50/30 animate-in fade-in duration-150"
                  >
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
