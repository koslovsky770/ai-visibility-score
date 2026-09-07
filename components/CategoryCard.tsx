"use client";

import { useState } from "react";
import type { CategoryScore } from "@/lib/types";
import { STATUS_LABELS, STATUS_COLORS, SOURCE_TYPE_LABELS, scoreColor } from "@/lib/displayHelpers";

export default function CategoryCard({ category }: { category: CategoryScore }) {
  const [open, setOpen] = useState(false);
  const ratio = category.maxPoints > 0 ? category.earnedPoints / category.maxPoints : 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-slate-800">{category.name}</h3>
        <span className={`text-lg font-bold ${scoreColor(ratio)}`}>
          {category.earnedPoints}/{category.maxPoints}
        </span>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full bg-current transition-all ${scoreColor(ratio)}`}
          style={{ width: `${Math.min(100, ratio * 100)}%` }}
        />
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-800"
      >
        {open ? "הסתר פירוט" : "הצג פירוט קריטריונים"}
      </button>

      {open && (
        <ul className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          {category.criteria.map((c) => (
            <li key={c.id} className="text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[c.status]}`}
                >
                  {STATUS_LABELS[c.status]}
                </span>
                <span className="font-medium text-slate-700">{c.label}</span>
                <span className="text-xs text-slate-400">({SOURCE_TYPE_LABELS[c.sourceType]})</span>
              </div>
              <p className="mt-1 text-slate-500">{c.explanation}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
