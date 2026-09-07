import type {
  SiteSnapshot,
  CriterionResult,
  EnrichedCriterionResult,
  CategoryScore,
  AnalysisReport,
  TopAction,
} from "./types";
import { CATEGORY_INFO, criteriaForTrack, type ResolvedTrack } from "./criteria";

function statusEarnedRatio(status: CriterionResult["status"]): number {
  switch (status) {
    case "ok":
      return 1;
    case "partial":
      return 0.5;
    default:
      return 0;
  }
}

function tierFor(score: number): { label: string; range: string } {
  if (score >= 90) return { label: "רמת מוכנות גבוהה מאוד", range: "90–100" };
  if (score >= 75) return { label: "האתר בנוי בצורה טובה מאוד", range: "75–89" };
  if (score >= 60) return { label: "בסיס טוב, ויש מקום לשיפור", range: "60–74" };
  if (score >= 40) return { label: "יש בסיס, אבל קיימים פערים משמעותיים", range: "40–59" };
  return { label: "האתר כמעט לא מוכן", range: "0–39" };
}

export function aggregateReport(
  snapshot: SiteSnapshot,
  track: ResolvedTrack,
  ruleResults: CriterionResult[],
  llmResults: CriterionResult[],
  topActions: TopAction[],
): AnalysisReport {
  const allDefs = criteriaForTrack(track);
  const resultsById = new Map<string, CriterionResult>();
  for (const r of [...ruleResults, ...llmResults]) resultsById.set(r.id, r);

  const enrichedAll: EnrichedCriterionResult[] = allDefs.map((def) => {
    const found = resultsById.get(def.id);
    const result: CriterionResult = found ?? {
      id: def.id,
      status: "not_checkable",
      explanation: "לא ניתן היה לבדוק קריטריון זה.",
      sourceType: "manual_required",
    };
    return { ...result, label: def.label, points: def.points, category: def.category };
  });

  const categories: CategoryScore[] = [1, 2, 3, 4, 5, 6].map((catNum) => {
    const info = CATEGORY_INFO[catNum];
    const inCategory = enrichedAll.filter((c) => c.category === catNum);
    const applicable = inCategory.filter(
      (c) => c.status !== "not_applicable" && c.status !== "not_checkable",
    );
    const applicableMaxPoints = applicable.reduce((s, c) => s + c.points, 0);
    const applicableEarned = applicable.reduce((s, c) => s + c.points * statusEarnedRatio(c.status), 0);
    const earnedPoints =
      applicableMaxPoints > 0 ? (applicableEarned / applicableMaxPoints) * info.maxPoints : 0;

    return {
      category: catNum,
      name: info.name,
      maxPoints: info.maxPoints,
      earnedPoints: Math.round(earnedPoints * 10) / 10,
      criteria: inCategory,
    };
  });

  const totalScore = Math.round(categories.reduce((s, c) => s + c.earnedPoints, 0));

  const whatWorks = enrichedAll
    .filter((c) => c.status === "ok")
    .sort((a, b) => b.points - a.points)
    .slice(0, 7);

  const whatIsMissing = enrichedAll
    .filter((c) => c.status === "missing" || c.status === "partial")
    .sort((a, b) => {
      const lostA = a.points * (1 - statusEarnedRatio(a.status));
      const lostB = b.points * (1 - statusEarnedRatio(b.status));
      return lostB - lostA;
    })
    .slice(0, 10);

  return {
    business: snapshot.business,
    analyzedUrl: snapshot.finalUrl,
    totalScore,
    tier: tierFor(totalScore),
    categories,
    whatWorks,
    whatIsMissing,
    topActions,
    crawlWarnings: snapshot.crawlWarnings,
    pagesAnalyzed: snapshot.pages.filter((p) => !p.fetchError).map((p) => ({ url: p.url, role: p.role })),
  };
}
