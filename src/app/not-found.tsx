import React from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import {
  FileQuestion,
  Home,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found (404) | MediaNest",
  description:
    "The requested page could not be found. Return to the homepage to paste a YouTube URL and download MP3 or MP4.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-xl w-full text-center space-y-6">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50 border border-red-100 text-red-600 shadow-sm mx-auto">
            <FileQuestion className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-red-600">
              Error 404
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
              Page Not Found
            </h1>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              The page you requested does not exist. Return to the homepage to paste a YouTube video URL and download MP3 or MP4.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <Link href="/" role="button">
              <Button
                variant="primary"
                size="md"
                leftIcon={<Home className="w-4 h-4" />}
              >
                Return to Homepage
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
