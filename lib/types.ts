export type PageRole = "home" | "about" | "contact" | "service" | "blog" | "other";

export interface PageSnapshot {
  url: string;
  role: PageRole;
  httpStatus: number | null;
  fetchError?: string;
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  robotsMeta: string | null;
  h1: string[];
  h2: string[];
  h3: string[];
  bodyText: string;
  wordCount: number;
  paragraphCount: number;
  internalLinks: { href: string; text: string }[];
  externalLinks: { href: string; text: string }[];
  contactHrefs: string[];
  images: { src: string; alt: string | null }[];
  jsonLd: unknown[];
  hasBreadcrumbMarkup: boolean;
  scriptBytes: number;
  htmlBytes: number;
}

export interface SiteSnapshot {
  inputUrl: string;
  finalUrl: string;
  business: { name: string; field: string; region: string };
  robotsTxt: {
    exists: boolean;
    disallowedAll: boolean;
    disallowedPaths: string[];
    sitemapUrls: string[];
  };
  sitemapXml: { exists: boolean; urlCount: number; urls: string[] };
  pages: PageSnapshot[];
  crawlWarnings: string[];
  crawlFailed: boolean;
  crawlFailReason?: string;
}

export type CriterionStatus =
  | "ok"
  | "partial"
  | "missing"
  | "not_applicable"
  | "not_checkable";

export type CriterionSourceType = "automatic" | "content_analysis" | "manual_required";

export interface CriterionResult {
  id: string;
  status: CriterionStatus;
  explanation: string;
  sourceType: CriterionSourceType;
}

export interface EnrichedCriterionResult extends CriterionResult {
  label: string;
  points: number;
  category: number;
}

export interface CategoryScore {
  category: number;
  name: string;
  maxPoints: number;
  earnedPoints: number;
  criteria: EnrichedCriterionResult[];
}

export interface TopAction {
  title: string;
  detail: string;
}

export interface AnalysisReport {
  business: { name: string; field: string; region: string };
  analyzedUrl: string;
  totalScore: number;
  tier: { label: string; range: string };
  categories: CategoryScore[];
  whatWorks: EnrichedCriterionResult[];
  whatIsMissing: EnrichedCriterionResult[];
  topActions: TopAction[];
  crawlWarnings: string[];
  pagesAnalyzed: { url: string; role: PageRole }[];
}
