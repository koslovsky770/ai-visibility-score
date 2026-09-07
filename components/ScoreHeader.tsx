import type { AnalysisReport } from "@/lib/types";
import { scoreColor } from "@/lib/displayHelpers";

export default function ScoreHeader({ report }: { report: AnalysisReport }) {
  const ratio = report.totalScore / 100;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 text-center shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {report.business.name} · {report.analyzedUrl}
      </p>

      <p className="mt-6 text-sm text-slate-500">הציון שלך</p>
      <div className={`mt-1 text-7xl sm:text-8xl font-extrabold ${scoreColor(ratio)}`}>
        {report.totalScore}
        <span className="text-3xl sm:text-4xl text-slate-400 font-semibold">/100</span>
      </div>

      <p className="mt-4 text-xl sm:text-2xl font-bold text-slate-800">{report.tier.label}</p>
      <p className="text-sm text-slate-400">טווח {report.tier.range}</p>

      <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-slate-500">
        הציון משקף מוכנות ונראות דיגיטלית לפי קריטריונים מוגדרים של בהירות, סמכות, תוכן, מבנה
        ונגישות טכנית — הוא <span className="font-semibold">אינו</span> מבטיח הופעה בתשובות של
        ChatGPT, Gemini, Google AI Overviews או כל מנוע AI אחר.
      </p>
    </div>
  );
}
