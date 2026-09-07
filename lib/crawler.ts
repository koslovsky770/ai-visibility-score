import * as cheerio from "cheerio";
import type { SiteSnapshot, PageSnapshot, PageRole } from "./types";
import { discoverCandidatePages, type DiscoveredLink } from "./pageDiscovery";

const USER_AGENT = "AIVisibilityScoreBot/0.1 (+MVP site-readiness checker)";
const FETCH_TIMEOUT_MS = 10_000;
const MAX_PAGES = 10;

function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url;
}

async function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml,*/*" },
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function parseRobotsTxt(raw: string): { disallowedAll: boolean; disallowedPaths: string[]; sitemapUrls: string[] } {
  const lines = raw.split(/\r?\n/).map((l) => l.trim());
  const sitemapUrls: string[] = [];
  const disallowedPaths: string[] = [];
  let inWildcardBlock = false;
  let sawWildcardAgent = false;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith("sitemap:")) {
      sitemapUrls.push(line.slice(line.indexOf(":") + 1).trim());
      continue;
    }
    if (lower.startsWith("user-agent:")) {
      const agent = line.slice(line.indexOf(":") + 1).trim();
      inWildcardBlock = agent === "*";
      if (inWildcardBlock) sawWildcardAgent = true;
      continue;
    }
    if (inWildcardBlock && lower.startsWith("disallow:")) {
      const path = line.slice(line.indexOf(":") + 1).trim();
      if (path) disallowedPaths.push(path);
    }
  }

  const disallowedAll = sawWildcardAgent && disallowedPaths.includes("/");
  return { disallowedAll, disallowedPaths, sitemapUrls };
}

function isPathDisallowed(pathname: string, disallowedPaths: string[]): boolean {
  return disallowedPaths.some((p) => p && pathname.startsWith(p));
}

async function fetchRobotsTxt(origin: string) {
  try {
    const res = await fetchWithTimeout(`${origin}/robots.txt`, 6000);
    if (!res.ok) return { exists: false, disallowedAll: false, disallowedPaths: [], sitemapUrls: [] };
    const raw = await res.text();
    const parsed = parseRobotsTxt(raw);
    return { exists: true, ...parsed };
  } catch {
    return { exists: false, disallowedAll: false, disallowedPaths: [], sitemapUrls: [] };
  }
}

async function fetchSitemapUrls(origin: string, declaredSitemaps: string[]) {
  const candidates = declaredSitemaps.length > 0 ? declaredSitemaps : [`${origin}/sitemap.xml`];
  for (const sitemapUrl of candidates) {
    try {
      const res = await fetchWithTimeout(sitemapUrl, 6000);
      if (!res.ok) continue;
      const raw = await res.text();
      const $ = cheerio.load(raw, { xmlMode: true });
      const urls: string[] = [];
      $("loc").each((_, el) => {
        const text = $(el).text().trim();
        if (text) urls.push(text);
      });
      if (urls.length > 0) return { exists: true, urlCount: urls.length, urls };
    } catch {
      continue;
    }
  }
  return { exists: false, urlCount: 0, urls: [] as string[] };
}

async function fetchAndParsePage(url: string, role: PageRole, siteHostname: string): Promise<PageSnapshot> {
  const base: Omit<PageSnapshot, "httpStatus" | "fetchError"> = {
    url,
    role,
    title: null,
    metaDescription: null,
    canonical: null,
    robotsMeta: null,
    h1: [],
    h2: [],
    h3: [],
    bodyText: "",
    wordCount: 0,
    paragraphCount: 0,
    internalLinks: [],
    externalLinks: [],
    contactHrefs: [],
    images: [],
    jsonLd: [],
    hasBreadcrumbMarkup: false,
    scriptBytes: 0,
    htmlBytes: 0,
  };

  try {
    const res = await fetchWithTimeout(url);
    const html = await res.text();
    const $ = cheerio.load(html);

    const scriptBytes = $("script")
      .toArray()
      .reduce((sum, el) => sum + ($(el).html()?.length ?? 0), 0);

    const jsonLd: unknown[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      const raw = $(el).contents().text();
      try {
        const parsed = JSON.parse(raw);
        jsonLd.push(parsed);
      } catch {
        // malformed JSON-LD — skip, don't crash the crawl
      }
    });

    const content = $.root().clone();
    content.find("script, style, noscript, svg").remove();
    const bodyText = content.text().replace(/\s+/g, " ").trim();
    const paragraphCount = $("p").filter((_, el) => $(el).text().trim().length > 0).length;

    const internalLinks: { href: string; text: string }[] = [];
    const externalLinks: { href: string; text: string }[] = [];
    const contactHrefs: string[] = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") ?? "";
      const text = $(el).text().trim().replace(/\s+/g, " ");
      if (!href || href.startsWith("#")) return;
      if (href.startsWith("mailto:") || href.startsWith("tel:")) {
        contactHrefs.push(href);
        return;
      }
      try {
        const abs = new URL(href, url);
        if (abs.hostname === siteHostname) {
          internalLinks.push({ href: abs.toString(), text });
        } else {
          externalLinks.push({ href: abs.toString(), text });
        }
      } catch {
        // ignore malformed hrefs
      }
    });

    const images: { src: string; alt: string | null }[] = [];
    $("img").each((_, el) => {
      const src = $(el).attr("src") ?? "";
      const alt = $(el).attr("alt") ?? null;
      if (src) images.push({ src, alt });
    });

    const hasBreadcrumbMarkup =
      jsonLd.some((b) => JSON.stringify(b).includes("BreadcrumbList")) ||
      $('[class*="breadcrumb" i], [aria-label*="breadcrumb" i]').length > 0;

    return {
      ...base,
      httpStatus: res.status,
      title: $("title").first().text().trim() || null,
      metaDescription: $('meta[name="description"]').attr("content")?.trim() || null,
      canonical: $('link[rel="canonical"]').attr("href")?.trim() || null,
      robotsMeta: $('meta[name="robots"]').attr("content")?.trim().toLowerCase() || null,
      h1: $("h1").map((_, el) => $(el).text().trim()).get().filter(Boolean),
      h2: $("h2").map((_, el) => $(el).text().trim()).get().filter(Boolean),
      h3: $("h3").map((_, el) => $(el).text().trim()).get().filter(Boolean),
      bodyText,
      wordCount: bodyText.split(/\s+/).filter(Boolean).length,
      paragraphCount,
      internalLinks,
      externalLinks,
      contactHrefs,
      images,
      jsonLd,
      hasBreadcrumbMarkup,
      scriptBytes,
      htmlBytes: html.length,
    };
  } catch (err) {
    return {
      ...base,
      httpStatus: null,
      fetchError: err instanceof Error ? err.message : "שגיאה לא ידועה בסריקת העמוד",
    };
  }
}

export async function buildSiteSnapshot(
  inputUrl: string,
  business: { name: string; field: string; region: string },
): Promise<SiteSnapshot> {
  const homeUrl = normalizeUrl(inputUrl);
  const crawlWarnings: string[] = [];
  let origin: string;
  let hostname: string;
  try {
    const parsed = new URL(homeUrl);
    origin = parsed.origin;
    hostname = parsed.hostname;
  } catch {
    return {
      inputUrl,
      finalUrl: homeUrl,
      business,
      robotsTxt: { exists: false, disallowedAll: false, disallowedPaths: [], sitemapUrls: [] },
      sitemapXml: { exists: false, urlCount: 0, urls: [] },
      pages: [],
      crawlWarnings: ["כתובת ה-URL שהוזנה אינה תקינה"],
      crawlFailed: true,
      crawlFailReason: "invalid_url",
    };
  }

  const robotsTxt = await fetchRobotsTxt(origin);
  if (robotsTxt.disallowedAll) {
    crawlWarnings.push("robots.txt של האתר חוסם סריקה גורפת — הניתוח יתבסס על מידע חלקי בלבד");
  }

  const sitemapXml = await fetchSitemapUrls(origin, robotsTxt.sitemapUrls);

  const homePage = await fetchAndParsePage(homeUrl, "home", hostname);
  if (homePage.fetchError || (homePage.httpStatus !== null && homePage.httpStatus >= 400)) {
    return {
      inputUrl,
      finalUrl: homeUrl,
      business,
      robotsTxt,
      sitemapXml,
      pages: [homePage],
      crawlWarnings: [
        ...crawlWarnings,
        "לא ניתן היה לגשת לדף הבית של האתר (חסימה, שגיאת שרת או timeout) — הדוח מבוסס על מידע חלקי בלבד",
      ],
      crawlFailed: true,
      crawlFailReason: homePage.fetchError ?? `http_${homePage.httpStatus}`,
    };
  }

  const navLinks: DiscoveredLink[] = homePage.internalLinks.map((l) => ({ url: l.href, text: l.text }));
  const candidates = discoverCandidatePages(navLinks, sitemapXml.urls, homeUrl, MAX_PAGES);

  const disallowed = candidates.filter((c) => {
    try {
      return isPathDisallowed(new URL(c.url).pathname, robotsTxt.disallowedPaths);
    } catch {
      return false;
    }
  });
  const allowedCandidates = candidates.filter((c) => !disallowed.includes(c));
  if (disallowed.length > 0) {
    crawlWarnings.push(`robots.txt חוסם ${disallowed.length} מהעמודים שזוהו — הם לא נכללו בניתוח`);
  }

  const otherPages = await Promise.all(
    allowedCandidates.map((c) => fetchAndParsePage(c.url, c.role, hostname)),
  );

  const pages = [homePage, ...otherPages];

  const totalScriptBytes = pages.reduce((s, p) => s + p.scriptBytes, 0);
  const totalHtmlBytes = pages.reduce((s, p) => s + p.htmlBytes, 0);
  const totalWords = pages.reduce((s, p) => s + p.wordCount, 0);
  if (totalHtmlBytes > 0 && totalWords < 50 && totalScriptBytes > totalHtmlBytes * 0.3) {
    crawlWarnings.push(
      "האתר נראה כמבוסס במידה רבה על JavaScript בצד לקוח (SPA). הכלי סורק HTML סטטי בלבד, ולכן חלק מהתוכן עשוי שלא להיראות בבדיקה — אין להסיק מכך בהכרח שהתוכן חסר בפועל.",
    );
  }

  const fetchErrors = otherPages.filter((p) => p.fetchError).length;
  if (fetchErrors > 0) {
    crawlWarnings.push(`${fetchErrors} מתוך העמודים שזוהו לא נטענו בהצלחה ולא נכללו בניתוח המלא`);
  }

  return {
    inputUrl,
    finalUrl: homeUrl,
    business,
    robotsTxt,
    sitemapXml,
    pages,
    crawlWarnings,
    crawlFailed: false,
  };
}
