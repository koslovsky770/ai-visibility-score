import { timingSafeEqual } from "node:crypto";

export interface ConfirmedPayment {
  externalId: string; // Grow transaction id — makes webhook retries idempotent
  email: string | null;
  amountAgorot: number | null;
}

/**
 * Turns a Grow server-to-server callback into a confirmed payment, or null when
 * the payload is not a successful payment of the expected amount.
 *
 * TODO(grow): finish once Grow support confirms the callback field names and
 * how a callback is authenticated. Until then this returns null on purpose, so
 * no credit is ever granted from an unverified payload; raw callbacks are still
 * stored in grow_events so the real format can be inspected. Credits can be
 * issued manually via /api/admin/credit in the meantime.
 */
export function parseGrowCallback(fields: Record<string, string>): ConfirmedPayment | null {
  void fields;
  return null;
}

export function secretMatches(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
