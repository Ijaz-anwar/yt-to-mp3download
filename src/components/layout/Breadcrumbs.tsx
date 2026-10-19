import React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCanonicalUrl } from "@/config/site";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  // Generate authentic BreadcrumbList structured data matching visible content
  const breadcrumbListSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: getCanonicalUrl("/"),
      },
      ...items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 2,
        name: item.label,
        ...(item.href ? { item: getCanonicalUrl(item.href) } : {}),
      })),
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbListSchema} />
      <nav
        aria-label="Breadcrumb"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 pb-2"
      >
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <li className="flex items-center">
            <Link
              href="/"
              className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
          </li>
          {items.map((item, idx) => {
            const isLast = idx === items.length - 1;
            return (
              <li key={idx} className="flex items-center gap-1.5">
                <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="text-slate-500 hover:text-indigo-600 transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className="font-semibold text-slate-800"
                    aria-current={isLast ? "page" : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
