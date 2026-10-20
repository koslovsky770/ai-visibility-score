import { randomBytes } from "node:crypto";
import { db } from "./db";
import type { AnalysisReport } from "./types";

// A credit that stays "in_progress" longer than this is assumed to belong to a
// run that died (timeout / crash) and may be claimed again.
const STALE_RUN_MINUTES = 10;

export type CreditInfo =
  | { found: false }
  | { found: true; status: "available" | "in_progress" | "done"; reportId: string | null };

function newToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Idempotent on externalId: a repeated payment notification returns the same credit. */
export async function grantCredit(input: {
  externalId: string;
  email?: string | null;
  amountAgorot?: number | null;
  source: "grow" | "manual";
}): Promise<{ token: string; created: boolean }> {
  const sql = await db();
  const inserted = (await sql`
    INSERT INTO orders (external_id, email, amount_agorot, source)
    VALUES (${input.externalId}, ${input.email ?? null}, ${input.amountAgorot ?? null}, ${input.source})
    ON CONFLICT (external_id) DO NOTHING
    RETURNING id`) as { id: string }[];

  if (inserted.length === 0) {
    const existing = (await sql`
      SELECT c.token FROM credits c JOIN orders o ON o.id = c.order_id
      WHERE o.external_id = ${input.externalId} LIMIT 1`) as { token: string }[];
    if (existing[0]) return { token: existing[0].token, created: false };
  }

  const orderId =
    inserted[0]?.id ??
    ((await sql`SELECT id FROM orders WHERE external_id = ${input.externalId}`) as { id: string }[])[0].id;
  const token = newToken();
  await sql`INSERT INTO credits (token, order_id) VALUES (${token}, ${orderId})`;
  return { token, created: true };
}

export async function getCredit(token: string): Promise<CreditInfo> {
  const sql = await db();
  const rows = (await sql`
    SELECT status, report_id FROM credits WHERE token = ${token}`) as {
    status: "available" | "in_progress" | "done";
    report_id: string | null;
  }[];
  if (rows.length === 0) return { found: false };
  return { found: true, status: rows[0].status, reportId: rows[0].report_id };
}

/** Atomically claims the credit for one analysis run. */
export async function claimCredit(token: string): Promise<boolean> {
  const sql = await db();
  const rows = (await sql`
    UPDATE credits SET status = 'in_progress', started_at = now()
    WHERE token = ${token}
      AND (status = 'available'
           OR (status = 'in_progress'
               AND started_at < now() - make_interval(mins => ${STALE_RUN_MINUTES})))
    RETURNING token`) as unknown[];
  return rows.length === 1;
}

/** Gives the credit back after a failed run (our fault, not the customer's). */
export async function releaseCredit(token: string): Promise<void> {
  const sql = await db();
  await sql`UPDATE credits SET status = 'available', started_at = NULL
            WHERE token = ${token} AND status = 'in_progress'`;
}

export async function completeRun(
  token: string,
  inputUrl: string,
  report: AnalysisReport,
  usage: unknown,
): Promise<string> {
  const sql = await db();
  const rows = (await sql`
    INSERT INTO reports (credit_token, input_url, report, usage)
    VALUES (${token}, ${inputUrl}, ${JSON.stringify(report)}::jsonb, ${JSON.stringify(usage ?? null)}::jsonb)
    RETURNING id`) as { id: string }[];
  const reportId = rows[0].id;
  await sql`UPDATE credits SET status = 'done', report_id = ${reportId} WHERE token = ${token}`;
  return reportId;
}

export async function getReport(id: string): Promise<AnalysisReport | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const sql = await db();
  const rows = (await sql`SELECT report FROM reports WHERE id = ${id}`) as { report: AnalysisReport }[];
  return rows[0]?.report ?? null;
}
