import { test, expect } from "@playwright/test";

test.describe("MediaNest Technical SEO & Canonical Pages", () => {
  const routes = [
    { path: "/", heading: /Download YouTube Videos as MP3 or MP4/i },
    { path: "/how-it-works", heading: /How to Download YouTube Videos/i },
    { path: "/faq", heading: /Frequently Asked Questions/i },
    { path: "/privacy", heading: /Privacy Policy/i },
    { path: "/terms", heading: /Terms of Service/i },
    { path: "/contact", heading: /Contact Us/i },
    { path: "/es", heading: /Descargar Videos de YouTube en MP3 o MP4/i },
    { path: "/fr", heading: /Télécharger des Vidéos YouTube en MP3 ou MP4/i },
    { path: "/de", heading: /YouTube-Videos als MP3 oder MP4 Herunterladen/i },
    { path: "/pt", heading: /Baixar Vídeos do YouTube em MP3 ou MP4/i },
  ];

  for (const route of routes) {
    test(`verifies page ${route.path} loads cleanly with h1 and canonical tag`, async ({ page }) => {
      const response = await page.goto(route.path);
      expect(response?.status()).toBe(200);

      // Check h1 heading
      const h1 = page.locator("h1");
      await expect(h1).toBeVisible();
      await expect(h1).toHaveText(route.heading);

      // Check canonical link
      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveCount(1);
      const href = await canonical.getAttribute("href");
      expect(href).toBeTruthy();
      expect(href).toMatch(/^https?:\/\//);

      // Check meta description
      const metaDescription = page.locator('meta[name="description"]');
      await expect(metaDescription).toHaveCount(1);
      const descContent = await metaDescription.getAttribute("content");
      expect(descContent).toBeTruthy();
      expect(descContent!.length).toBeGreaterThan(20);
    });
  }

  test("verifies robots.txt route returns crawler directives and sitemap link", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/user-agent:\s*\*/i);
    expect(body).toContain("Disallow: /api/");
    expect(body).toContain("Disallow: /_next/");
    expect(body).toContain("Sitemap:");
    expect(body).toContain("/sitemap.xml");
  });

  test("verifies sitemap.xml returns all canonical pages in valid XML", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("<?xml");
    expect(body).toContain("<urlset");

    for (const route of routes) {
      const relativeSuffix = route.path === "/" ? "" : route.path;
      expect(body).toContain(relativeSuffix);
    }
  });

  test("verifies JSON-LD structured data on homepage, FAQ, and breadcrumb pages", async ({ page }) => {
    // 1. Homepage
    await page.goto("/");
    const homeJsonLds = await page.locator('script[type="application/ld+json"]').all();
    expect(homeJsonLds.length).toBeGreaterThanOrEqual(1);
    for (const tag of homeJsonLds) {
      const jsonText = await tag.textContent();
      expect(jsonText).toBeTruthy();
      const parsed = JSON.parse(jsonText!);
      expect(parsed["@context"]).toBe("https://schema.org");
    }

    // 2. FAQ page
    await page.goto("/faq");
    const faqJsonLds = await page.locator('script[type="application/ld+json"]').all();
    expect(faqJsonLds.length).toBeGreaterThanOrEqual(1);
    let foundFaqSchema = false;
    for (const tag of faqJsonLds) {
      const jsonText = await tag.textContent();
      const parsed = JSON.parse(jsonText!);
      if (parsed["@type"] === "FAQPage") {
        foundFaqSchema = true;
        expect(Array.isArray(parsed.mainEntity)).toBe(true);
        expect(parsed.mainEntity.length).toBeGreaterThanOrEqual(4);
      }
    }
    expect(foundFaqSchema).toBe(true);
  });
});
