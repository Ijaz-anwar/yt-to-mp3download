import type { MetadataRoute } from "next";
import { getCanonicalUrl } from "@/config/site";
import { SUPPORTED_LOCALES, getLocalePath } from "@/lib/i18n/translations";
import { buildLanguageAlternates } from "@/components/pages/LocalizedPages";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const basePages = [
    { path: "/", changeFrequency: "daily" as const, priority: 1.0 },
    { path: "/how-it-works", changeFrequency: "monthly" as const, priority: 0.8 },
    { path: "/faq", changeFrequency: "monthly" as const, priority: 0.8 },
    { path: "/contact", changeFrequency: "monthly" as const, priority: 0.7 },
    { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.5 },
    { path: "/terms", changeFrequency: "yearly" as const, priority: 0.5 },
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const localeObj of SUPPORTED_LOCALES) {
    for (const page of basePages) {
      entries.push({
        url: getCanonicalUrl(getLocalePath(localeObj.code, page.path)),
        lastModified,
        changeFrequency: page.changeFrequency,
        priority: localeObj.code === "en" ? page.priority : Number((page.priority * 0.9).toFixed(2)),
        alternates: {
          languages: buildLanguageAlternates(page.path),
        },
      });
    }
  }

  return entries;
}
