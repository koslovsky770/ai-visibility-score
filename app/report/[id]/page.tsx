import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getReport } from "@/lib/access";
import ReportView from "@/components/ReportView";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await getReport(id);
  if (!report) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-16">
      <header className="mb-10 text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">AI Visibility Score</h1>
        <p className="mt-3 text-lg text-slate-500">הדוח המלא לאתר שלך</p>
      </header>
      <ReportView report={report} />
    </main>
  );
}
