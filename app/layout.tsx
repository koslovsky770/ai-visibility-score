import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  title: "AI Visibility Score — עד כמה האתר שלך מוכן לעידן ה-AI?",
  description:
    "בדיקת מוכנות ונראות דיגיטלית של אתר עסקי למנועי חיפוש ומנועי AI.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html dir="rtl" lang="he" className={`${heebo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
