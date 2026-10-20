import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { SiteSnapshot, CriterionResult, TopAction } from "./types";
import { CATEGORY_INFO, criteriaForTrack, type ResolvedTrack } from "./criteria";

const MAX_PAGE_TEXT_CHARS = 2500;

const StatusEnum = z.enum(["ok", "partial", "missing", "not_applicable", "not_checkable"]);

const CriterionResultSchema = z.object({
  id: z.string(),
  status: StatusEnum,
  explanation: z.string(),
});

const TopActionSchema = z.object({
  title: z.string(),
  detail: z.string(),
});

const LLMOutputSchema = z.object({
  criteria: z.array(CriterionResultSchema),
  topActions: z.array(TopActionSchema).length(5),
});

function condenseSnapshotForPrompt(snapshot: SiteSnapshot) {
  return {
    business: snapshot.business,
    crawlWarnings: snapshot.crawlWarnings,
    pages: snapshot.pages
      .filter((p) => !p.fetchError)
      .map((p) => ({
        url: p.url,
        role: p.role,
        title: p.title,
        metaDescription: p.metaDescription,
        h1: p.h1.slice(0, 5),
        h2: p.h2.slice(0, 10),
        h3: p.h3.slice(0, 10),
        wordCount: p.wordCount,
        bodyTextExcerpt: p.bodyText.slice(0, MAX_PAGE_TEXT_CHARS),
        schemaTypesFound: p.jsonLd
          .map((b) => (b as Record<string, unknown>)?.["@type"])
          .filter(Boolean),
      })),
  };
}

const SYSTEM_PROMPT = `אתה מנתח מוכנות אתרים עסקיים למנועי חיפוש ומנועי AI, במסגרת כלי בשם "AI Visibility Score".

תפקידך: לקבל תמצית מובנית של תוכן שנסרק מאתר עסקי (עד 10 עמודים), ולדרג רשימת קריטריונים נתונה בהתאם למה שבאמת מופיע בתוכן שסופק.

כללים מחייבים:
1. התבסס אך ורק על התוכן שסופק לך. אל תמציא מידע, ואל תניח הנחות על מה שקיים באתר מעבר למה שכתוב בתמצית.
2. אם התוכן שסופק לא מספיק כדי להכריע לגבי קריטריון מסוים (למשל בגלל טקסט קצר מדי, חשד לאתר מבוסס JavaScript, או חוסר מידע), החזר עבורו סטטוס "not_checkable" ואל תנחש.
3. אם קריטריון לא רלוונטי לסוג העסק הנוכחי (לדוגמה: "שם האנשים מאחורי העסק" בעסק גדול עם צוות אנונימי, כאשר זה סביר ולגיטימי), החזר "not_applicable".
4. אתה יכול לקבוע אמינות של המלצות/עדויות רק ככאלה שקיימות באתר — לעולם אל תטען שהצלחת לאמת שהן אמיתיות.
5. לעולם אל תעריך או תרמוז האם ChatGPT, Gemini או כל מנוע AI אחר "אוהב" את האתר, ולעולם אל תבטיח הופעה בתשובות של מנועי AI. אתה מעריך מוכנות ובהירות דיגיטלית בלבד, לפי הקריטריונים הנתונים.
6. explanation לכל קריטריון: משפט אחד קצר וברור בעברית, המנוסח לבעל עסק שאינו איש טכנולוגיה, ומתייחס לתוכן הספציפי שנמצא (או לא נמצא) באתר.
7. topActions: בדיוק 5 פעולות, מדורגות לפי שילוב של השפעה על הציון, קלות ביצוע, וחשיבות להבנת העסק והתוכן. כל פעולה חייבת להיות קונקרטית ומעשית, ולהתייחס לעמוד או לתוכן ספציפי כאשר ניתן — למשל "בעמוד הבית לא ברור למי השירות מיועד. הוסיפו מתחת לכותרת הראשית משפט שמגדיר את סוג הלקוחות ואת השירות המרכזי." ולא ניסוח כללי כמו "שפרו את התוכן".
8. החזר תוצאה עבור כל אחד ואחד מהקריטריונים ברשימה שסופקה, בדיוק לפי המזהים (id) שניתנו — לא פחות ולא יותר.`;

export async function runLlmAnalysis(
  snapshot: SiteSnapshot,
  track: ResolvedTrack,
): Promise<{ criteria: CriterionResult[]; topActions: TopAction[]; usage: unknown }> {
  const llmCriteria = criteriaForTrack(track).filter((c) => c.source === "llm");

  const criteriaForPrompt = llmCriteria.map((c) => ({
    id: c.id,
    category: c.category,
    categoryName: CATEGORY_INFO[c.category].name,
    label: c.label,
    points: c.points,
  }));

  const client = new Anthropic();

  const userContent = JSON.stringify(
    {
      siteData: condenseSnapshotForPrompt(snapshot),
      criteriaToScore: criteriaForPrompt,
    },
    null,
    2,
  );

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
    output_config: {
      effort: "high",
      format: zodOutputFormat(LLMOutputSchema),
    },
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error("מודל השפה לא החזיר תשובה תקינה בפורמט הצפוי.");
  }

  const criteriaResults: CriterionResult[] = parsed.criteria.map((c) => ({
    id: c.id,
    status: c.status,
    explanation: c.explanation,
    sourceType: "content_analysis" as const,
  }));

  return {
    criteria: criteriaResults,
    topActions: parsed.topActions,
    usage: { model: "claude-opus-5", ...response.usage },
  };
}
