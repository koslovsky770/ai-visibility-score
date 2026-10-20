import { NextRequest, NextResponse } from "next/server";
import { buildSiteSnapshot } from "@/lib/crawler";
import { runRuleEngine } from "@/lib/ruleEngine";
import { runLlmAnalysis } from "@/lib/llmAnalysis";
import { aggregateReport } from "@/lib/aggregator";
import { resolveTrack } from "@/lib/criteria";
import { claimCredit, completeRun, getCredit, releaseCredit } from "@/lib/access";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const token = typeof b.token === "string" ? b.token.trim() : "";
  const url = typeof b.url === "string" ? b.url.trim() : "";
  const businessName = typeof b.businessName === "string" ? b.businessName.trim() : "";
  const field = typeof b.field === "string" ? b.field.trim() : "";
  const region = typeof b.region === "string" ? b.region.trim() : "";

  if (!token) {
    return NextResponse.json({ error: "נדרש קישור גישה מהרכישה." }, { status: 401 });
  }
  if (!url || !businessName) {
    return NextResponse.json({ error: "יש להזין לפחות כתובת אתר ושם עסק." }, { status: 400 });
  }

  const credit = await getCredit(token);
  if (!credit.found) {
    return NextResponse.json({ error: "קישור הגישה אינו תקין." }, { status: 403 });
  }
  if (credit.status === "done" && credit.reportId) {
    return NextResponse.json({ reportId: credit.reportId });
  }
  if (!(await claimCredit(token))) {
    return NextResponse.json(
      { error: "הבדיקה כבר מתבצעת. המתינו כמה דקות ורעננו את העמוד." },
      { status: 409 },
    );
  }

  // From here on the credit is held; every failure path must give it back.
  try {
    const track = resolveTrack(region);
    const snapshot = await buildSiteSnapshot(url, { name: businessName, field, region });

    if (snapshot.crawlFailed) {
      await releaseCredit(token);
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
    const llm = await runLlmAnalysis(snapshot, track);
    const report = aggregateReport(snapshot, track, ruleResults, llm.criteria, llm.topActions);
    const reportId = await completeRun(token, snapshot.finalUrl, report, llm.usage);
    return NextResponse.json({ reportId, report });
  } catch (err) {
    console.error("Analysis failed", err);
    await releaseCredit(token).catch((e) => console.error("Credit release failed", e));
    return NextResponse.json(
      { error: "אירעה שגיאה בביצוע הבדיקה. הקרדיט שלכם לא נוצל — נסו שוב בעוד כמה דקות." },
      { status: 502 },
    );
  }
}
