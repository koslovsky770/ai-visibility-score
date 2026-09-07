export type Track = "both" | "local" | "brand";
export type ResolvedTrack = "local" | "brand";
export type CriterionSource = "rule" | "llm";

export interface CriterionDef {
  id: string;
  category: 1 | 2 | 3 | 4 | 5 | 6;
  label: string;
  points: number;
  source: CriterionSource;
  track?: Track;
}

export const CATEGORY_INFO: Record<number, { name: string; maxPoints: number }> = {
  1: { name: "בהירות עסק וישות", maxPoints: 20 },
  2: { name: "סמכות, ניסיון ואמון", maxPoints: 20 },
  3: { name: "תוכן שעונה על שאלות אמיתיות", maxPoints: 20 },
  4: { name: "מבנה והבנת תוכן", maxPoints: 15 },
  5: { name: "מידע מובנה ונגישות טכנית", maxPoints: 15 },
  6: { name: "נוכחות מקומית / מותגית", maxPoints: 10 },
};

// Single source of truth for the scoring model — used by both the rule
// engine and the LLM prompt, so weights never drift between them.
export const CRITERIA: CriterionDef[] = [
  // קטגוריה 1 — בהירות עסק וישות (20)
  { id: "biz_name_clear", category: 1, label: "שם העסק מופיע בבירור", points: 2, source: "llm" },
  { id: "above_fold_clarity", category: 1, label: "ברור מיד מה העסק עושה", points: 4, source: "llm" },
  { id: "target_audience_clear", category: 1, label: "ברור למי מיועד השירות", points: 3, source: "llm" },
  { id: "services_listed", category: 1, label: "שירותים מרכזיים מוצגים בבירור", points: 3, source: "llm" },
  { id: "real_description", category: 1, label: "תיאור עסק אמיתי (לא רק סלוגן)", points: 3, source: "llm" },
  { id: "about_page_meaningful", category: 1, label: "עמוד אודות משמעותי", points: 2, source: "llm" },
  { id: "people_named", category: 1, label: "שם האנשים מאחורי העסק (כשרלוונטי)", points: 1, source: "llm" },
  { id: "contact_details_clear", category: 1, label: "פרטי קשר ברורים", points: 2, source: "rule" },

  // קטגוריה 2 — סמכות, ניסיון ואמון (20)
  { id: "experience_shown", category: 2, label: "ניסיון מקצועי מוצג", points: 3, source: "llm" },
  { id: "years_active", category: 2, label: "שנות פעילות מצוינות", points: 2, source: "llm" },
  { id: "credentials", category: 2, label: "הכשרות / הסמכות / השכלה", points: 2, source: "llm" },
  { id: "case_studies", category: 2, label: "פרויקטים, לקוחות או מקרי בוחן", points: 3, source: "llm" },
  { id: "testimonials_present", category: 2, label: "קיום המלצות", points: 3, source: "llm" },
  { id: "results_proof", category: 2, label: "הוכחות לתוצאות", points: 2, source: "llm" },
  { id: "full_business_details", category: 2, label: "פרטי עסק מלאים", points: 2, source: "llm" },
  { id: "external_profile_links", category: 2, label: "קישורים לפרופילים עסקיים חיצוניים", points: 1, source: "rule" },
  { id: "clear_who_is_behind", category: 2, label: "ברור מי עומד מאחורי המידע באתר", points: 2, source: "llm" },

  // קטגוריה 3 — תוכן שעונה על שאלות אמיתיות (20)
  { id: "detailed_service_pages", category: 3, label: "דפי שירות מפורטים", points: 3, source: "llm" },
  { id: "each_service_explained", category: 3, label: "כל שירות מקבל הסבר עצמאי", points: 3, source: "llm" },
  { id: "problem_solution_process", category: 3, label: "מוסבר בעיה, פתרון ותהליך עבודה", points: 3, source: "llm" },
  { id: "faq_present", category: 3, label: "שאלות ותשובות", points: 2, source: "llm" },
  { id: "articles_present", category: 3, label: "מאמרים מקצועיים", points: 3, source: "llm" },
  { id: "original_content", category: 3, label: "תוכן מקורי ולא גנרי", points: 3, source: "llm" },
  { id: "unique_examples_data", category: 3, label: "דוגמאות, נתונים או תובנות ייחודיות", points: 2, source: "llm" },
  { id: "answers_customer_questions", category: 3, label: "עמודים שעונים לשאלות לקוח פוטנציאלי", points: 1, source: "llm" },

  // קטגוריה 4 — מבנה והבנת תוכן (15)
  { id: "h1_present", category: 4, label: "כותרת H1 ברורה בכל עמוד מרכזי", points: 3, source: "rule" },
  { id: "heading_hierarchy", category: 4, label: "היררכיה סבירה של H2/H3", points: 2, source: "rule" },
  { id: "headings_descriptive", category: 4, label: "כותרות שמתארות את התוכן ולא רק סלוגן", points: 2, source: "llm" },
  { id: "paragraph_structure", category: 4, label: "חלוקה לפסקאות ונושאים", points: 2, source: "rule" },
  { id: "internal_links", category: 4, label: "קישורים פנימיים בין עמודים רלוונטיים", points: 2, source: "rule" },
  { id: "clear_navigation", category: 4, label: "ניווט ברור", points: 2, source: "rule" },
  { id: "url_structure", category: 4, label: "כתובות URL הגיוניות", points: 1, source: "rule" },
  { id: "title_meta", category: 4, label: "Title ו-Meta Description", points: 1, source: "rule" },

  // קטגוריה 5 — מידע מובנה ונגישות טכנית (15)
  { id: "crawlable_no_login", category: 5, label: "האתר נגיש לסריקה ללא login", points: 1, source: "rule" },
  { id: "robots_txt", category: 5, label: "robots.txt קיים ותקין", points: 1, source: "rule" },
  { id: "sitemap_xml", category: 5, label: "קיימת מפת אתר XML", points: 2, source: "rule" },
  { id: "no_noindex", category: 5, label: "אין noindex בעמודים מרכזיים", points: 2, source: "rule" },
  { id: "canonical_valid", category: 5, label: "קיים canonical תקין", points: 1, source: "rule" },
  { id: "structured_data_relevant", category: 5, label: "קיים structured data רלוונטי", points: 3, source: "rule" },
  { id: "local_business_schema", category: 5, label: "Organization / LocalBusiness schema", points: 2, source: "rule" },
  { id: "breadcrumbs", category: 5, label: "Breadcrumbs מובנים", points: 1, source: "rule" },
  { id: "nap_schema_consistency", category: 5, label: "עקביות פרטי עסק בין הטקסט לסכימה", points: 1, source: "rule" },
  { id: "content_not_image_only", category: 5, label: "תוכן חשוב קיים ב-HTML ולא רק בתמונה", points: 1, source: "rule" },

  // קטגוריה 6 — נוכחות מקומית (10, כאשר יש אזור פעילות)
  { id: "local_name_consistent", category: 6, label: "שם עסק עקבי", points: 2, source: "rule", track: "local" },
  { id: "local_address", category: 6, label: "כתובת", points: 2, source: "rule", track: "local" },
  { id: "local_phone", category: 6, label: "טלפון", points: 2, source: "rule", track: "local" },
  { id: "local_service_area", category: 6, label: "אזורי שירות", points: 1, source: "llm", track: "local" },
  { id: "local_hours", category: 6, label: "שעות פעילות", points: 1, source: "rule", track: "local" },
  { id: "local_gbp_link", category: 6, label: "קישור או אזכור ל-Google Business Profile", points: 1, source: "rule", track: "local" },
  { id: "local_location_in_content", category: 6, label: "שילוב מיקום בתוכן באופן טבעי", points: 1, source: "llm", track: "local" },

  // קטגוריה 6 — נוכחות מותגית (10, כאשר אין אזור פעילות מקומי)
  { id: "brand_name_consistent", category: 6, label: "שם מותג ברור ועקבי", points: 3, source: "llm", track: "brand" },
  { id: "brand_official_links", category: 6, label: "קישורים לפרופילים רשמיים", points: 3, source: "rule", track: "brand" },
  { id: "brand_mentions", category: 6, label: "אזכורי חברה או מותג באתר עצמו", points: 2, source: "llm", track: "brand" },
  { id: "brand_consistent_info", category: 6, label: "מידע עקבי על החברה", points: 2, source: "llm", track: "brand" },
];

export function resolveTrack(region: string): ResolvedTrack {
  const trimmed = region.trim();
  if (!trimmed) return "brand";
  const nationalMarkers = ["ארצי", "ארצי בלבד", "אונליין", "כל הארץ", "לאומי", "מקוון"];
  if (nationalMarkers.some((m) => trimmed.includes(m))) return "brand";
  return "local";
}

export function criteriaForTrack(track: ResolvedTrack): CriterionDef[] {
  return CRITERIA.filter((c) => !c.track || c.track === "both" || c.track === track);
}
