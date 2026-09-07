# AI Visibility Score

בדיקת מוכנות ונראות דיגיטלית של אתר עסקי למנועי חיפוש ומנועי AI — לפי קריטריונים של בהירות, סמכות, תוכן, מבנה ונגישות טכנית.

## הרצה מקומית

1. העתיקו את `.env.local.example` ל-`.env.local` והזינו מפתח מ-[console.anthropic.com](https://console.anthropic.com) בשדה `ANTHROPIC_API_KEY`.
2. `npm install`
3. `npm run dev` ופתחו את [http://localhost:3000](http://localhost:3000)

## מבנה

- `app/api/analyze/route.ts` — אורכיסטרציה: סריקה → מנוע כללים → ניתוח Claude → איחוד ציונים.
- `lib/criteria.ts` — מקור האמת היחיד למודל הניקוד (6 קטגוריות, 100 נקודות).
- `lib/crawler.ts`, `lib/pageDiscovery.ts` — סריקת עד 10 עמודים מרכזיים באתר.
- `lib/ruleEngine.ts` — בדיקות דטרמיניסטיות (מבנה, נגישות טכנית).
- `lib/llmAnalysis.ts` — ניתוח סמנטי (בהירות עסק, סמכות, איכות תוכן) דרך Claude.
- `lib/aggregator.ts` — איחוד הציונים לדוח סופי.
- `components/` — רכיבי תצוגת הדוח.
