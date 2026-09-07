import type { EnrichedCriterionResult } from "@/lib/types";

function List({
  items,
  emptyText,
  tone,
}: {
  items: EnrichedCriterionResult[];
  emptyText: string;
  tone: "positive" | "negative";
}) {
  const dot = tone === "positive" ? "bg-emerald-500" : "bg-rose-500";
  if (items.length === 0) {
    return <p className="text-sm text-slate-400">{emptyText}</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-2 text-sm">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
          <div>
            <p className="font-medium text-slate-700">{item.label}</p>
            <p className="text-slate-500">{item.explanation}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function FindingsList({
  whatWorks,
  whatIsMissing,
}: {
  whatWorks: EnrichedCriterionResult[];
  whatIsMissing: EnrichedCriterionResult[];
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-bold text-emerald-700">מה כבר עובד טוב</h3>
        <List items={whatWorks} emptyText="לא נמצאו עדיין נקודות חוזק בולטות." tone="positive" />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-bold text-rose-700">מה חסר</h3>
        <List items={whatIsMissing} emptyText="לא נמצאו פערים משמעותיים." tone="negative" />
      </div>
    </div>
  );
}
