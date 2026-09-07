import Link from "next/link";

export default function WorkshopPlaceholder() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold text-slate-800">
        סדנת &quot;האם AI מכיר את העסק שלך?&quot;
      </h1>
      <p className="text-slate-500">העמוד הזה ייפתח בקרוב. תודה על ההתעניינות!</p>
      <Link href="/" className="font-medium text-indigo-600 hover:text-indigo-800">
        חזרה לבדיקת האתר
      </Link>
    </main>
  );
}
