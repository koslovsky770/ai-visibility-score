import type { AnalysisReport } from "@/lib/types";
import ScoreHeader from "@/components/ScoreHeader";
import CategoryCard from "@/components/CategoryCard";
import FindingsList from "@/components/FindingsList";
import TopActions from "@/components/TopActions";

export default function ReportView({ report }: { report: AnalysisReport }) {
  return (
    <div className="space-y-8">
      <ScoreHeader report={report} />

      {report.crawlWarnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">שימו לב:</p>
          <ul className="mt-1 list-inside list-disc space-y-1">
            {report.crawlWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {report.categories.map((cat) => (
          <CategoryCard key={cat.category} category={cat} />
        ))}
      </div>

      <FindingsList whatWorks={report.whatWorks} whatIsMissing={report.whatIsMissing} />
      <TopActions actions={report.topActions} />
    </div>
  );
}
