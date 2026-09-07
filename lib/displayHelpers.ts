import type { CriterionStatus, CriterionSourceType } from "./types";

export const STATUS_LABELS: Record<CriterionStatus, string> = {
  ok: "תקין",
  partial: "חלקי",
  missing: "חסר",
  not_applicable: "לא רלוונטי",
  not_checkable: "לא ניתן היה לבדוק אוטומטית",
};

export const STATUS_COLORS: Record<CriterionStatus, string> = {
  ok: "bg-emerald-100 text-emerald-800 border-emerald-300",
  partial: "bg-amber-100 text-amber-800 border-amber-300",
  missing: "bg-rose-100 text-rose-800 border-rose-300",
  not_applicable: "bg-slate-100 text-slate-600 border-slate-300",
  not_checkable: "bg-slate-100 text-slate-500 border-slate-300",
};

export const SOURCE_TYPE_LABELS: Record<CriterionSourceType, string> = {
  automatic: "זוהה אוטומטית",
  content_analysis: "ניתוח תוכן",
  manual_required: "דורש בדיקה ידנית",
};

export function scoreColor(ratio: number): string {
  if (ratio >= 0.75) return "text-emerald-600";
  if (ratio >= 0.4) return "text-amber-600";
  return "text-rose-600";
}
