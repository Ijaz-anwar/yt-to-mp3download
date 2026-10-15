"use client";

import React, { useState } from "react";
import {
  ArrowRightLeft,
  Download,
  Music2,
  FileSearch,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroMediaStudio } from "@/components/home/HeroMediaStudio";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { SupportedFormatsSection } from "@/components/home/SupportedFormatsSection";
import { WhyChooseSection } from "@/components/home/WhyChooseSection";
import { FaqSection } from "@/components/home/FaqSection";
import { MediaConverterTool } from "@/components/tools/MediaConverterTool";
import { DirectDownloaderTool } from "@/components/tools/DirectDownloaderTool";
import { AudioExtractorTool } from "@/components/tools/AudioExtractorTool";
import { MetadataInspectorTool } from "@/components/tools/MetadataInspectorTool";

export function MediaNestApp() {
  const [activeTab, setActiveTab] = useState<string>("converter");

  const tabs = [
    {
      id: "converter",
      label: "Media Converter",
      icon: <ArrowRightLeft className="w-4 h-4" />,
    },
    {
      id: "downloader",
      label: "Direct Downloader",
      icon: <Download className="w-4 h-4" />,
    },
    {
      id: "extractor",
      label: "Audio Extractor",
      icon: <Music2 className="w-4 h-4" />,
    },
    {
      id: "inspector",
      label: "Metadata Inspector",
      icon: <FileSearch className="w-4 h-4" />,
    },
  ];

  const handleNavigateSection = (sectionId: "home" | "video" | "audio" | "how-it-works" | "faq") => {
    if (sectionId === "video") {
      setActiveTab("converter");
    } else if (sectionId === "audio") {
      setActiveTab("extractor");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header onNavigateSection={handleNavigateSection} />

      <main className="flex-1">
        {/* Hero Section & Quick Media Processing Studio */}
        <HeroMediaStudio />

        {/* Specialized Tools Tabs Section */}
        <section id="specialized-tools" className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 mb-20">
          <div className="text-center max-w-xl mx-auto mb-6">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block mb-1">
              Specialized Utility Modes
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              Advanced Media Tooling
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Switch to targeted workflows for deep metadata inspection, pure audio extraction, or direct stream grabbing.
            </p>
          </div>

          {/* Tab Selector Bar */}
          <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-slate-200/90 mb-6 flex overflow-x-auto scrollbar-none gap-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 whitespace-nowrap flex-1 justify-center ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <span className={isActive ? "text-white" : "text-slate-400"}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Utility Tool Content */}
          <div className="transition-all">
            {activeTab === "converter" && <MediaConverterTool />}
            {activeTab === "downloader" && <DirectDownloaderTool />}
            {activeTab === "extractor" && <AudioExtractorTool />}
            {activeTab === "inspector" && <MetadataInspectorTool />}
          </div>
        </section>

        {/* Informational & Marketing Sections */}
        <HowItWorksSection />
        <SupportedFormatsSection />
        <WhyChooseSection />
        <FaqSection />
      </main>

      <Footer />
    </div>
  );
}
