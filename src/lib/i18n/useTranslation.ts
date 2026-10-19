"use client";

import { usePathname } from "next/navigation";
import {
  Locale,
  TRANSLATIONS,
  TranslationDictionary,
  isValidLocale,
  getLocalePath,
} from "./translations";

export function detectLocaleFromPathname(pathname: string | null): {
  locale: Locale;
  basePath: string;
} {
  if (!pathname) {
    return { locale: "en", basePath: "/" };
  }
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0]?.toLowerCase() || "";
  if (isValidLocale(firstSegment)) {
    const rest = "/" + segments.slice(1).join("/");
    return { locale: firstSegment, basePath: rest === "/" ? "/" : rest };
  }
  return { locale: "en", basePath: pathname };
}

export function useTranslation(explicitLocale?: Locale): {
  locale: Locale;
  basePath: string;
  t: TranslationDictionary;
  localePath: (subPath?: string) => string;
} {
  const pathname = usePathname();
  const detected = detectLocaleFromPathname(pathname);
  const locale = explicitLocale || detected.locale;

  return {
    locale,
    basePath: detected.basePath,
    t: TRANSLATIONS[locale] || TRANSLATIONS.en,
    localePath: (subPath = "/") => getLocalePath(locale, subPath),
  };
}
