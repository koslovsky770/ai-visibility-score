import type { PageRole } from "./types";

const ABOUT_KEYWORDS = ["אודות", "מי אנחנו", "הסיפור שלנו", "about-us", "about", "who-we-are"];
const CONTACT_KEYWORDS = ["צור קשר", "יצירת קשר", "contact-us", "contact"];
const SERVICE_KEYWORDS = ["שירות", "שירותים", "מוצר", "מוצרים", "service", "services", "product", "products", "solutions", "פתרונות"];
const BLOG_KEYWORDS = ["בלוג", "מאמרים", "מאמר", "חדשות", "blog", "articles", "article", "news", "insights"];

// Legal/boilerplate pages (terms, privacy, agreements) often contain words
// like "service" in their URL/title and would otherwise be misclassified as
// product/service pages, wasting crawl budget on non-content pages.
const BOILERPLATE_PATH_HINTS = [
  "/legal/",
  "terms",
  "privacy",
  "cookie",
  "agreement",
  "/policy",
  "policies",
];

export interface DiscoveredLink {
  url: string;
  text: string;
}

function isBoilerplate(link: DiscoveredLink): boolean {
  let pathname = "";
  try {
    pathname = new URL(link.url).pathname.toLowerCase();
  } catch {
    pathname = link.url.toLowerCase();
  }
  return BOILERPLATE_PATH_HINTS.some((hint) => pathname.includes(hint));
}

function matchesKeywords(link: DiscoveredLink, keywords: string[]): boolean {
  const haystack = `${link.text} ${link.url}`.toLowerCase();
  return keywords.some((k) => haystack.includes(k.toLowerCase()));
}

function classify(link: DiscoveredLink): PageRole | null {
  if (isBoilerplate(link)) return null;
  if (matchesKeywords(link, CONTACT_KEYWORDS)) return "contact";
  if (matchesKeywords(link, ABOUT_KEYWORDS)) return "about";
  if (matchesKeywords(link, BLOG_KEYWORDS)) return "blog";
  if (matchesKeywords(link, SERVICE_KEYWORDS)) return "service";
  return null;
}

/**
 * Picks up to `limit` candidate URLs (excluding the homepage) to crawl,
 * prioritizing one about page, one contact page, then services, then blog
 * posts. Falls back to sitemap URLs when nav links don't surface enough
 * candidates.
 */
export function discoverCandidatePages(
  navLinks: DiscoveredLink[],
  sitemapUrls: string[],
  homeUrl: string,
  limit: number,
): { url: string; role: PageRole }[] {
  const seen = new Set<string>([homeUrl]);
  const buckets: Record<Exclude<PageRole, "home" | "other">, string[]> = {
    about: [],
    contact: [],
    service: [],
    blog: [],
  };

  const allLinks = [
    ...navLinks,
    ...sitemapUrls.map((u) => ({ url: u, text: "" })),
  ];

  for (const link of allLinks) {
    if (seen.has(link.url)) continue;
    const role = classify(link);
    if (!role || role === "home" || role === "other") continue;
    if (buckets[role].includes(link.url)) continue;
    buckets[role].push(link.url);
    seen.add(link.url);
  }

  const result: { url: string; role: PageRole }[] = [];
  const take = (role: Exclude<PageRole, "home" | "other">, max: number) => {
    for (const url of buckets[role].slice(0, max)) {
      if (result.length >= limit - 1) return;
      result.push({ url, role });
    }
  };

  take("about", 1);
  take("contact", 1);
  take("service", 4);
  take("blog", 3);

  return result.slice(0, limit - 1);
}
