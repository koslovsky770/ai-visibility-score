"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ScanningLoader from "@/components/ScanningLoader";

type ViewState =
  | { status: "form" }
  | { status: "loading" }
  | { status: "error"; message: string; warnings?: string[] };

export default function Home() {
  return (
    <Suspense>
      <HomeInner />
    </Suspense>
  );
}

function HomeInner() {
  const router = useRouter();
  const token = useSearchParams().get("t");
  const [view, setView] = useState<ViewState>({ status: "form" });
  const [form, setForm] = useState({ url: "", businessName: "", field: "", region: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setView({ status: "loading" });
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, token }),
      });
      const data = await res.json();

      if (!res.ok) {
        setView({ status: "error", message: data.error ?? "אירעה שגיאה. נסו שוב." });
        return;
      }
      if (data.crawlFailed) {
        setView({ status: "error", message: data.message, warnings: data.crawlWarnings });
        return;
      }
      router.push(`/report/${data.reportId}`);
    } catch {
      setView({ status: "error", message: "אירעה שגיאת תקשורת. בדקו את החיבור ונסו שוב." });
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-16">
      <header className="mb-10 text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">AI Visibility Score</h1>
        <p className="mt-3 text-lg text-slate-500">עד כמה האתר שלך מוכן לעידן ה-AI?</p>
      </header>

      {view.status === "form" && !token && <PurchasePrompt />}

      {view.status === "form" && token && (
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm"
        >
          <Field
            label="כתובת האתר"
            required
            value={form.url}
            onChange={(v) => setForm((f) => ({ ...f, url: v }))}
            placeholder="לדוגמה: mybusiness.co.il"
          />
          <Field
            label="שם העסק"
            required
            value={form.businessName}
            onChange={(v) => setForm((f) => ({ ...f, businessName: v }))}
            placeholder="שם העסק כפי שמופיע באתר"
          />
          <Field
            label="תחום הפעילות"
            value={form.field}
            onChange={(v) => setForm((f) => ({ ...f, field: v }))}
            placeholder="לדוגמה: עורך דין, מסעדה, ייעוץ עסקי"
          />
          <Field
            label="אזור פעילות (אם רלוונטי)"
            value={form.region}
            onChange={(v) => setForm((f) => ({ ...f, region: v }))}
            placeholder="לדוגמה: תל אביב, או 'ארצי' אם העסק אינו מקומי"
          />

          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-600 py-3 font-bold text-white transition hover:bg-indigo-700"
          >
            בדקו את האתר שלי
          </button>
        </form>
      )}

      {view.status === "loading" && <ScanningLoader />}

      {view.status === "error" && (
        <div className="space-y-4 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="font-semibold text-rose-800">{view.message}</p>
          {view.warnings && view.warnings.length > 1 && (
            <ul className="text-sm text-rose-600">
              {view.warnings.slice(1).map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setView({ status: "form" })}
            className="rounded-full bg-rose-600 px-5 py-2 font-medium text-white hover:bg-rose-700"
          >
            נסו שוב
          </button>
        </div>
      )}

    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      <input
        type="text"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </label>
  );
}

function PurchasePrompt() {
  const paymentUrl = process.env.NEXT_PUBLIC_FULL_AUDIT_PAYMENT_URL;
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-sm">
      <p className="text-lg font-bold text-slate-900">הבדיקה המלאה – 149 ₪, תשלום חד-פעמי</p>
      <p className="text-slate-600">
        לאחר התשלום תקבלו קישור אישי להזנת האתר ולקבלת הדוח המלא.
      </p>
      {paymentUrl && (
        <a
          href={paymentUrl}
          className="inline-block rounded-xl bg-indigo-600 px-8 py-3 font-bold text-white transition hover:bg-indigo-700"
        >
          לבדיקת האתר המלאה – 149 ₪
        </a>
      )}
    </div>
  );
}
