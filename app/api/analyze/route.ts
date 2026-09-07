import { NextRequest, NextResponse } from "next/server";
import { buildSiteSnapshot } from "@/lib/crawler";
import { runRuleEngine } from "@/lib/ruleEngine";
import { runLlmAnalysis } from "@/lib/llmAnalysis";
import { aggregateReport } from "@/lib/aggregator";
import { resolveTrack } from "@/lib/criteria";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const url = typeof b.url === "string" ? b.url.trim() : "";
  const businessName = typeof b.businessName === "string" ? b.businessName.trim() : "";
  const field = typeof b.field === "string" ? b.field.trim() : "";
  const region = typeof b.region === "string" ? b.region.trim() : "";

  if (!url || !businessName) {
    return NextResponse.json({ error: "יש להזין לפחות כתובת אתר ושם עסק." }, { status: 400 });
  }

  const track = resolveTrack(region);

  let snapshot;
  try {
    snapshot = await buildSiteSnapshot(url, { name: businessName, field, region });
  } catch (err) {
    console.error("Crawl failed unexpectedly", err);
    return NextResponse.json({ error: "אירעה שגיאה בסריקת האתר. נסו שוב מאוחר יותר." }, { status: 500 });
  }

  if (snapshot.crawlFailed) {
    return NextResponse.json(
      {
        crawlFailed: true,
        message: snapshot.crawlWarnings[0] ?? "לא ניתן היה לגשת לאתר.",
        crawlWarnings: snapshot.crawlWarnings,
      },
      { status: 200 },
    );
  }

  const ruleResults = runRuleEngine(snapshot, track);

  let llmResults;
  let topActions;
  try {
    const llm = await runLlmAnalysis(snapshot, track);
    llmResults = llm.criteria;
    topActions = llm.topActions;
  } catch (err) {
    console.error("LLM analysis failed", err);
    return NextResponse.json(
      {
        error:
          "לא ניתן היה להשלים את ניתוח התוכן (שירות ה-AI לא זמין כרגע). ודאו שמוגדר מפתח ANTHROPIC_API_KEY ונסו שוב.",
      },
      { status: 502 },
    );
  }

  const report = aggregateReport(snapshot, track, ruleResults, llmResults, topActions);
  return NextResponse.json({ report });
}
