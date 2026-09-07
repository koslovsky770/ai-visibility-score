import type { TopAction } from "@/lib/types";

export default function TopActions({ actions }: { actions: TopAction[] }) {
  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 sm:p-6 shadow-sm">
      <h3 className="mb-4 font-bold text-indigo-900">5 הפעולות החשובות ביותר עכשיו</h3>
      <ol className="space-y-4">
        {actions.map((action, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
              {i + 1}
            </span>
            <div>
              <p className="font-semibold text-slate-800">{action.title}</p>
              <p className="text-sm text-slate-600">{action.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
