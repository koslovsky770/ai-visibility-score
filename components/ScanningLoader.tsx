"use client";

import { useEffect, useState } from "react";

const STAGES = [
  "מתחברים לאתר…",
  "סורקים את דף הבית…",
  "מאתרים עמודים מרכזיים (אודות, צור קשר, שירותים)…",
  "בודקים מבנה, כותרות ונתונים מובנים…",
  "מנתחים את התוכן לפי קריטריוני AI Visibility…",
  "מחשבים ציון ומרכיבים את הדוח…",
];

const STAGE_INTERVAL_MS = 2700;

export default function ScanningLoader() {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, STAGES.length - 1));
    }, STAGE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-10 text-center shadow-sm">
      <div className="relative mx-auto h-28 w-28">
        <span className="absolute inset-0 rounded-full border border-indigo-200" />
        <span className="absolute inset-3 rounded-full border border-indigo-200 [animation:ping_2.4s_ease-out_infinite]" />
        <span className="absolute inset-7 rounded-full border border-indigo-300 [animation:ping_2.4s_ease-out_infinite] [animation-delay:0.6s]" />
        <div
          className="absolute inset-0 animate-spin rounded-full [animation-duration:2.1s]"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, rgba(79,70,229,0.5) 70deg, transparent 110deg)",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="h-3 w-3 rounded-full bg-indigo-600" />
        </div>
      </div>

      <p className="mt-6 text-lg font-bold text-slate-800">סורקים ומנתחים את האתר…</p>
      <p className="text-sm text-slate-400">זה יכול לקחת עד כדקה</p>

      <ul className="mx-auto mt-6 max-w-xs space-y-2.5">
        {STAGES.map((stage, i) => {
          const done = i < stageIndex;
          const current = i === stageIndex;
          return (
            <li key={stage} className="flex items-center gap-2.5 text-sm">
              {done ? (
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-emerald-500">
                  <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.15" />
                  <path
                    d="M6 10.5l2.5 2.5 5.5-6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : current ? (
                <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
              ) : (
                <span className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-200" />
              )}
              <span className={done || current ? "text-slate-700" : "text-slate-300"}>{stage}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
