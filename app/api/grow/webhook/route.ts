import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { grantCredit } from "@/lib/access";
import { parseGrowCallback, secretMatches } from "@/lib/grow";

// Grow posts form-encoded fields (not JSON). The shared secret travels in the
// notifyUrl query string: https://<host>/api/grow/webhook?secret=<GROW_WEBHOOK_SECRET>
export async function POST(req: NextRequest) {
  if (!secretMatches(req.nextUrl.searchParams.get("secret"), process.env.GROW_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const fields: Record<string, string> = {};
  try {
    const form = await req.formData();
    for (const [k, v] of form.entries()) if (typeof v === "string") fields[k] = v;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const sql = await db();
  const payment = parseGrowCallback(fields);
  await sql`INSERT INTO grow_events (payload, handled, note)
            VALUES (${JSON.stringify(fields)}::jsonb, ${payment !== null},
                    ${payment ? null : "not a confirmed payment (or parser not finished)"})`;

  if (payment) {
    await grantCredit({ ...payment, source: "grow" });
    // TODO(grow): email the customer their access link (Resend) and call Grow's ApproveTransaction.
  }
  return NextResponse.json({ ok: true });
}
