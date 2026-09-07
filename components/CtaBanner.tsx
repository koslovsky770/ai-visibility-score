import Link from "next/link";

export default function CtaBanner() {
  return (
    <div className="rounded-2xl bg-slate-900 p-6 sm:p-8 text-center text-white">
      <p className="text-lg sm:text-xl font-bold">
        רוצים להבין איך לתקן את הפערים ולהתאים את האתר לעידן ה-AI?
      </p>
      <Link
        href="/workshop"
        className="mt-5 inline-block rounded-full bg-white px-6 py-3 font-bold text-slate-900 transition hover:bg-slate-100"
      >
        לסדנת &quot;האם AI מכיר את העסק שלך?&quot;
      </Link>
    </div>
  );
}
