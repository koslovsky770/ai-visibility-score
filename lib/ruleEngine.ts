import type { SiteSnapshot, PageSnapshot, CriterionResult, CriterionStatus } from "./types";
import { criteriaForTrack, type ResolvedTrack } from "./criteria";

const PHONE_RE = /(?:\+972[-\s]?|0)(?:[23489]|5[0-9]|7[0-9])[-\s]?\d{3}[-\s]?\d{4}/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const KNOWN_PROFILE_HOSTS = [
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "x.com",
  "twitter.com",
  "youtube.com",
  "tiktok.com",
];
const GBP_HOSTS = ["google.com/maps", "g.page", "business.google.com", "goo.gl/maps"];
const HOURS_HINT = /(שעות פעילות|שעות פתיחה|ימים א['׳]?\s*-\s*ה['׳]?|\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2})/;

function result(id: string, status: CriterionStatus, explanation: string): CriterionResult {
  return { id, status, explanation, sourceType: "automatic" };
}

function usablePages(snapshot: SiteSnapshot): PageSnapshot[] {
  return snapshot.pages.filter((p) => !p.fetchError && p.httpStatus !== null && p.httpStatus < 400);
}

function ratioStatus(ratio: number): CriterionStatus {
  if (ratio >= 0.8) return "ok";
  if (ratio > 0) return "partial";
  return "missing";
}

function extractPhones(text: string): string[] {
  return [...text.matchAll(PHONE_RE)].map((m) => m[0].replace(/[-\s]/g, ""));
}

function extractEmails(text: string): string[] {
  return [...text.matchAll(EMAIL_RE)].map((m) => m[0].toLowerCase());
}

function allText(pages: PageSnapshot[]): string {
  return pages.map((p) => `${p.title ?? ""} ${p.bodyText}`).join(" \n ");
}

// ---- Category 1 ----
function checkContactDetailsClear(pages: PageSnapshot[]): CriterionResult {
  const text = allText(pages);
  const hasPhone = extractPhones(text).length > 0 || pages.some((p) => p.contactHrefs.some((h) => h.startsWith("tel:")));
  const hasEmail = extractEmails(text).length > 0 || pages.some((p) => p.contactHrefs.some((h) => h.startsWith("mailto:")));
  const hasContactPage = pages.some((p) => p.role === "contact");
  if ((hasPhone && hasEmail) || (hasContactPage && (hasPhone || hasEmail))) {
    return result("contact_details_clear", "ok", "נמצאו פרטי קשר (טלפון ו/או אימייל) בעמוד ייעודי או בעמודי האתר.");
  }
  if (hasPhone || hasEmail || hasContactPage) {
    return result("contact_details_clear", "partial", "נמצא ערוץ קשר אחד בלבד (טלפון/אימייל), ללא עמוד צור קשר מובנה או ללא שני הערוצים יחד.");
  }
  return result("contact_details_clear", "missing", "לא נמצאו טלפון, אימייל או עמוד צור קשר באתר.");
}

// ---- Category 2 ----
function checkExternalProfileLinks(pages: PageSnapshot[]): CriterionResult {
  const links = pages.flatMap((p) => p.externalLinks.map((l) => l.href.toLowerCase()));
  const found = KNOWN_PROFILE_HOSTS.filter((host) => links.some((l) => l.includes(host)));
  if (found.length >= 2) return result("external_profile_links", "ok", `נמצאו קישורים לפרופילים חיצוניים: ${found.join(", ")}.`);
  if (found.length === 1) return result("external_profile_links", "partial", `נמצא קישור חיצוני יחיד (${found[0]}).`);
  return result("external_profile_links", "missing", "לא נמצאו קישורים לפרופילים עסקיים חיצוניים (רשתות חברתיות, לינקדאין וכו').");
}

// ---- Category 4 ----
function checkH1(pages: PageSnapshot[]): CriterionResult {
  if (pages.length === 0) return result("h1_present", "not_checkable", "לא ניתן היה לבדוק — האתר לא נסרק בהצלחה.");
  const withGoodH1 = pages.filter((p) => p.h1.length === 1).length;
  return result(
    "h1_present",
    ratioStatus(withGoodH1 / pages.length),
    `${withGoodH1} מתוך ${pages.length} עמודים שנסרקו עם כותרת H1 יחידה וברורה.`,
  );
}

function checkHeadingHierarchy(pages: PageSnapshot[]): CriterionResult {
  if (pages.length === 0) return result("heading_hierarchy", "not_checkable", "לא ניתן היה לבדוק — האתר לא נסרק בהצלחה.");
  const withH2 = pages.filter((p) => p.h1.length > 0 && p.h2.length > 0).length;
  const withH1 = pages.filter((p) => p.h1.length > 0).length;
  if (withH1 === 0) return result("heading_hierarchy", "not_checkable", "לא נמצאו כותרות H1 לבחינת ההיררכיה שמתחתיהן.");
  return result(
    "heading_hierarchy",
    ratioStatus(withH2 / withH1),
    `${withH2} מתוך ${withH1} עמודים עם H1 כוללים גם כותרות משנה (H2).`,
  );
}

function checkParagraphStructure(pages: PageSnapshot[]): CriterionResult {
  if (pages.length === 0) return result("paragraph_structure", "not_checkable", "לא ניתן היה לבדוק — האתר לא נסרק בהצלחה.");
  const withParagraphs = pages.filter((p) => p.paragraphCount >= 2).length;
  return result(
    "paragraph_structure",
    ratioStatus(withParagraphs / pages.length),
    `${withParagraphs} מתוך ${pages.length} עמודים מחולקים לכמה פסקאות ברורות.`,
  );
}

function checkInternalLinks(pages: PageSnapshot[]): CriterionResult {
  if (pages.length === 0) return result("internal_links", "not_checkable", "לא ניתן היה לבדוק — האתר לא נסרק בהצלחה.");
  const withLinks = pages.filter((p) => p.internalLinks.length >= 3).length;
  return result(
    "internal_links",
    ratioStatus(withLinks / pages.length),
    `${withLinks} מתוך ${pages.length} עמודים כוללים לפחות 3 קישורים פנימיים לתוכן רלוונטי.`,
  );
}

function checkNavigation(pages: PageSnapshot[]): CriterionResult {
  const home = pages.find((p) => p.role === "home");
  if (!home) return result("clear_navigation", "not_checkable", "לא ניתן היה לבדוק — דף הבית לא נסרק בהצלחה.");
  if (home.internalLinks.length >= 4) return result("clear_navigation", "ok", "דף הבית כולל ניווט עשיר עם מספר קישורים פנימיים.");
  if (home.internalLinks.length >= 1) return result("clear_navigation", "partial", "דף הבית כולל ניווט מצומצם בלבד.");
  return result("clear_navigation", "missing", "לא נמצאו קישורי ניווט פנימיים בדף הבית.");
}

function checkUrlStructure(pages: PageSnapshot[]): CriterionResult {
  if (pages.length === 0) return result("url_structure", "not_checkable", "לא ניתן היה לבדוק — האתר לא נסרק בהצלחה.");
  const readable = pages.filter((p) => {
    try {
      const path = new URL(p.url).pathname;
      if (path === "/" || path === "") return true;
      const lastSegment = path.split("/").filter(Boolean).pop() ?? "";
      const isIdLike = /^[0-9a-f]{6,}$/i.test(lastSegment) || /^\?/.test(lastSegment) || /^p=\d+$/.test(lastSegment);
      return !isIdLike && lastSegment.length > 0;
    } catch {
      return false;
    }
  }).length;
  return result("url_structure", ratioStatus(readable / pages.length), `${readable} מתוך ${pages.length} כתובות URL קריאות והגיוניות.`);
}

function checkTitleMeta(pages: PageSnapshot[]): CriterionResult {
  if (pages.length === 0) return result("title_meta", "not_checkable", "לא ניתן היה לבדוק — האתר לא נסרק בהצלחה.");
  const withBoth = pages.filter((p) => (p.title?.length ?? 0) >= 10 && (p.metaDescription?.length ?? 0) >= 20).length;
  return result("title_meta", ratioStatus(withBoth / pages.length), `${withBoth} מתוך ${pages.length} עמודים כוללים Title ו-Meta Description תקינים.`);
}

// ---- Category 5 ----
function checkCrawlableNoLogin(snapshot: SiteSnapshot, pages: PageSnapshot[]): CriterionResult {
  const home = pages.find((p) => p.role === "home");
  if (!home || snapshot.crawlFailed) return result("crawlable_no_login", "missing", "לא ניתן היה לגשת לאתר ללא חסימה או הפניה.");
  const looksLikeLogin = /login|signin|sign-in|התחבר/i.test(home.url);
  return looksLikeLogin
    ? result("crawlable_no_login", "partial", "דף הבית מפנה למסך התחברות — ייתכן שחלק מהתוכן נעול.")
    : result("crawlable_no_login", "ok", "האתר נגיש לסריקה ללא צורך בהתחברות.");
}

function checkRobotsTxt(snapshot: SiteSnapshot): CriterionResult {
  if (!snapshot.robotsTxt.exists) return result("robots_txt", "missing", "לא נמצא קובץ robots.txt.");
  if (snapshot.robotsTxt.disallowedAll) return result("robots_txt", "partial", "קיים robots.txt אך הוא חוסם סריקה גורפת של האתר.");
  return result("robots_txt", "ok", "קיים קובץ robots.txt תקין.");
}

function checkSitemap(snapshot: SiteSnapshot): CriterionResult {
  if (!snapshot.sitemapXml.exists) return result("sitemap_xml", "missing", "לא נמצאה מפת אתר XML.");
  return result("sitemap_xml", "ok", `נמצאה מפת אתר XML עם ${snapshot.sitemapXml.urlCount} כתובות.`);
}

function checkNoIndex(pages: PageSnapshot[]): CriterionResult {
  if (pages.length === 0) return result("no_noindex", "not_checkable", "לא ניתן היה לבדוק — האתר לא נסרק בהצלחה.");
  const withNoindex = pages.filter((p) => p.robotsMeta?.includes("noindex")).length;
  if (withNoindex === 0) return result("no_noindex", "ok", "לא נמצא תג noindex בעמודים המרכזיים שנסרקו.");
  if (withNoindex < pages.length) return result("no_noindex", "partial", `${withNoindex} מתוך ${pages.length} עמודים מסומנים ב-noindex.`);
  return result("no_noindex", "missing", "כל העמודים שנסרקו מסומנים ב-noindex — הם חסומים בפני מנועי חיפוש.");
}

function checkCanonical(pages: PageSnapshot[]): CriterionResult {
  if (pages.length === 0) return result("canonical_valid", "not_checkable", "לא ניתן היה לבדוק — האתר לא נסרק בהצלחה.");
  const withCanonical = pages.filter((p) => !!p.canonical).length;
  return result("canonical_valid", ratioStatus(withCanonical / pages.length), `${withCanonical} מתוך ${pages.length} עמודים כוללים תג canonical.`);
}

const RELEVANT_SCHEMA_TYPES = ["Organization", "LocalBusiness", "Service", "Article", "FAQPage", "BreadcrumbList", "Product"];

function schemaTypesOf(block: unknown): string[] {
  if (!block || typeof block !== "object") return [];
  const obj = block as Record<string, unknown>;
  const t = obj["@type"];
  if (typeof t === "string") return [t];
  if (Array.isArray(t)) return t.filter((x): x is string => typeof x === "string");
  if (Array.isArray(obj["@graph"])) return (obj["@graph"] as unknown[]).flatMap(schemaTypesOf);
  return [];
}

function checkStructuredData(pages: PageSnapshot[]): CriterionResult {
  const allBlocks = pages.flatMap((p) => p.jsonLd);
  if (allBlocks.length === 0) return result("structured_data_relevant", "missing", "לא נמצא structured data (JSON-LD) באתר.");
  const types = allBlocks.flatMap(schemaTypesOf);
  const relevantTypes = types.filter((t) => RELEVANT_SCHEMA_TYPES.includes(t));
  if (relevantTypes.length === 0) {
    return result("structured_data_relevant", "partial", `נמצא structured data אך מסוגים כלליים בלבד (${[...new Set(types)].join(", ") || "לא זוהה סוג"}) שאינם רלוונטיים במיוחד לעסק.`);
  }
  return result("structured_data_relevant", "ok", `נמצא structured data רלוונטי מסוג: ${[...new Set(relevantTypes)].join(", ")}.`);
}

function checkLocalBusinessSchema(pages: PageSnapshot[]): CriterionResult {
  const allBlocks = pages.flatMap((p) => p.jsonLd);
  const types = allBlocks.flatMap(schemaTypesOf);
  const hasOrg = types.some((t) => ["Organization", "LocalBusiness"].includes(t));
  if (!hasOrg) return result("local_business_schema", "missing", "לא נמצא סימון Schema מסוג Organization או LocalBusiness.");
  const block = allBlocks.find((b) => schemaTypesOf(b).some((t) => ["Organization", "LocalBusiness"].includes(t))) as
    | Record<string, unknown>
    | undefined;
  const hasName = !!block?.["name"];
  const hasContact = !!block?.["telephone"] || !!block?.["address"];
  if (hasName && hasContact) return result("local_business_schema", "ok", "נמצא Schema של Organization/LocalBusiness הכולל שם ופרטי קשר.");
  return result("local_business_schema", "partial", "נמצא Schema של Organization/LocalBusiness אך חסרים בו שדות מהותיים (שם/כתובת/טלפון).");
}

function checkBreadcrumbs(pages: PageSnapshot[]): CriterionResult {
  if (pages.length <= 3) return result("breadcrumbs", "not_applicable", "האתר קטן ובעל מבנה שטוח — breadcrumbs פחות רלוונטיים במקרה זה.");
  const withBreadcrumbs = pages.filter((p) => p.hasBreadcrumbMarkup).length;
  if (withBreadcrumbs === 0) return result("breadcrumbs", "missing", "לא נמצא סימון breadcrumbs באתר.");
  return result("breadcrumbs", "ok", `נמצא סימון breadcrumbs ב-${withBreadcrumbs} עמודים.`);
}

function checkNapSchemaConsistency(pages: PageSnapshot[]): CriterionResult {
  const text = allText(pages);
  const textPhones = new Set(extractPhones(text));
  const allBlocks = pages.flatMap((p) => p.jsonLd);
  const schemaPhones = new Set(
    allBlocks
      .map((b) => (b as Record<string, unknown>)?.["telephone"])
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.replace(/[-\s]/g, "")),
  );
  if (schemaPhones.size === 0 || textPhones.size === 0) {
    return result("nap_schema_consistency", "not_checkable", "לא נמצא מספיק מידע (טלפון בטקסט ו/או בסכימה) כדי לבדוק עקביות.");
  }
  const consistent = [...schemaPhones].some((sp) => [...textPhones].some((tp) => tp.includes(sp) || sp.includes(tp)));
  return consistent
    ? result("nap_schema_consistency", "ok", "פרטי הטלפון בטקסט הגלוי תואמים לאלה שב-structured data.")
    : result("nap_schema_consistency", "partial", "נמצא אי-התאמה בין פרטי הטלפון בטקסט הגלוי לבין אלה שב-structured data.");
}

function checkContentNotImageOnly(pages: PageSnapshot[]): CriterionResult {
  if (pages.length === 0) return result("content_not_image_only", "not_checkable", "לא ניתן היה לבדוק — האתר לא נסרק בהצלחה.");
  const poor = pages.filter((p) => p.wordCount < 40 && p.images.length >= 3);
  if (poor.length === 0) return result("content_not_image_only", "ok", "התוכן המרכזי קיים כטקסט ב-HTML ולא רק בתמונות.");
  return result(
    "content_not_image_only",
    poor.length >= pages.length / 2 ? "missing" : "partial",
    `ב-${poor.length} מתוך ${pages.length} עמודים כמות הטקסט נמוכה מאוד ביחס לכמות התמונות — ייתכן שתוכן מרכזי מוצג כתמונה או נטען ב-JavaScript.`,
  );
}

// ---- Category 6 — local ----
function checkLocalNameConsistent(pages: PageSnapshot[], businessName: string): CriterionResult {
  if (!businessName.trim()) return result("local_name_consistent", "not_checkable", "לא הוזן שם עסק לבדיקה.");
  const text = allText(pages).toLowerCase();
  const occurrences = text.split(businessName.toLowerCase()).length - 1;
  if (occurrences >= 2) return result("local_name_consistent", "ok", `שם העסק "${businessName}" מופיע באופן עקבי באתר.`);
  if (occurrences === 1) return result("local_name_consistent", "partial", `שם העסק "${businessName}" מופיע פעם אחת בלבד באתר.`);
  return result("local_name_consistent", "missing", `שם העסק "${businessName}" לא נמצא כלשונו בטקסט האתר.`);
}

function checkLocalAddress(pages: PageSnapshot[]): CriterionResult {
  const text = allText(pages);
  const addressHint = /(רחוב|רח['׳]|שדרות|כתובת)\s+[֐-׿\s]{2,30}\d{1,4}/;
  const allBlocks = pages.flatMap((p) => p.jsonLd);
  const schemaHasAddress = allBlocks.some((b) => !!(b as Record<string, unknown>)?.["address"]);
  if (addressHint.test(text) || schemaHasAddress) return result("local_address", "ok", "נמצאה כתובת פיזית באתר (בטקסט ו/או ב-structured data).");
  return result("local_address", "missing", "לא נמצאה כתובת פיזית ברורה באתר.");
}

function checkLocalPhone(pages: PageSnapshot[]): CriterionResult {
  const text = allText(pages);
  const phones = new Set(extractPhones(text));
  const hasTelLink = pages.some((p) => p.contactHrefs.some((h) => h.startsWith("tel:")));
  if (phones.size > 0 || hasTelLink) return result("local_phone", "ok", "נמצא מספר טלפון באתר.");
  return result("local_phone", "missing", "לא נמצא מספר טלפון באתר.");
}

function checkLocalHours(pages: PageSnapshot[]): CriterionResult {
  const text = allText(pages);
  if (HOURS_HINT.test(text)) return result("local_hours", "ok", "נמצא אזכור של שעות פעילות באתר.");
  return result("local_hours", "missing", "לא נמצא אזכור ברור של שעות פעילות.");
}

function checkLocalGbpLink(pages: PageSnapshot[]): CriterionResult {
  const links = pages.flatMap((p) => p.externalLinks.map((l) => l.href.toLowerCase()));
  const found = GBP_HOSTS.some((host) => links.some((l) => l.includes(host)));
  return found
    ? result("local_gbp_link", "ok", "נמצא קישור ל-Google Business Profile / Google Maps באתר.")
    : result("local_gbp_link", "missing", "לא נמצא קישור ל-Google Business Profile באתר (ייתכן שהפרופיל קיים ללא קישור מהאתר — לא ניתן לאמת זאת מבחוץ).");
}

// ---- Category 6 — brand ----
function checkBrandOfficialLinks(pages: PageSnapshot[]): CriterionResult {
  const links = pages.flatMap((p) => p.externalLinks.map((l) => l.href.toLowerCase()));
  const found = KNOWN_PROFILE_HOSTS.filter((host) => links.some((l) => l.includes(host)));
  if (found.length >= 2) return result("brand_official_links", "ok", `נמצאו קישורים לפרופילים רשמיים: ${found.join(", ")}.`);
  if (found.length === 1) return result("brand_official_links", "partial", `נמצא קישור רשמי יחיד (${found[0]}).`);
  return result("brand_official_links", "missing", "לא נמצאו קישורים לפרופילים רשמיים של המותג.");
}

export function runRuleEngine(snapshot: SiteSnapshot, track: ResolvedTrack): CriterionResult[] {
  const pages = usablePages(snapshot);
  const ruleCriteria = criteriaForTrack(track).filter((c) => c.source === "rule");
  const results: CriterionResult[] = [];

  for (const c of ruleCriteria) {
    switch (c.id) {
      case "contact_details_clear":
        results.push(checkContactDetailsClear(pages));
        break;
      case "external_profile_links":
        results.push(checkExternalProfileLinks(pages));
        break;
      case "h1_present":
        results.push(checkH1(pages));
        break;
      case "heading_hierarchy":
        results.push(checkHeadingHierarchy(pages));
        break;
      case "paragraph_structure":
        results.push(checkParagraphStructure(pages));
        break;
      case "internal_links":
        results.push(checkInternalLinks(pages));
        break;
      case "clear_navigation":
        results.push(checkNavigation(pages));
        break;
      case "url_structure":
        results.push(checkUrlStructure(pages));
        break;
      case "title_meta":
        results.push(checkTitleMeta(pages));
        break;
      case "crawlable_no_login":
        results.push(checkCrawlableNoLogin(snapshot, pages));
        break;
      case "robots_txt":
        results.push(checkRobotsTxt(snapshot));
        break;
      case "sitemap_xml":
        results.push(checkSitemap(snapshot));
        break;
      case "no_noindex":
        results.push(checkNoIndex(pages));
        break;
      case "canonical_valid":
        results.push(checkCanonical(pages));
        break;
      case "structured_data_relevant":
        results.push(checkStructuredData(pages));
        break;
      case "local_business_schema":
        results.push(checkLocalBusinessSchema(pages));
        break;
      case "breadcrumbs":
        results.push(checkBreadcrumbs(pages));
        break;
      case "nap_schema_consistency":
        results.push(checkNapSchemaConsistency(pages));
        break;
      case "content_not_image_only":
        results.push(checkContentNotImageOnly(pages));
        break;
      case "local_name_consistent":
        results.push(checkLocalNameConsistent(pages, snapshot.business.name));
        break;
      case "local_address":
        results.push(checkLocalAddress(pages));
        break;
      case "local_phone":
        results.push(checkLocalPhone(pages));
        break;
      case "local_hours":
        results.push(checkLocalHours(pages));
        break;
      case "local_gbp_link":
        results.push(checkLocalGbpLink(pages));
        break;
      case "brand_official_links":
        results.push(checkBrandOfficialLinks(pages));
        break;
      default:
        // Should not happen — every rule-sourced criterion has a handler above.
        results.push(result(c.id, "not_checkable", "לא ניתן היה לבדוק קריטריון זה אוטומטית."));
    }
  }

  return results;
}
