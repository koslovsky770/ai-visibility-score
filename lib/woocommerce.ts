import { createHmac, timingSafeEqual } from "node:crypto";

export interface WooOrder {
  id: number;
  status: string;
  currency?: string;
  total?: string;
  billing?: { email?: string };
  line_items?: { product_id?: number }[];
}

export interface ConfirmedPayment {
  externalId: string; // "woo:<order id>" — makes webhook retries idempotent
  email: string | null;
  amountAgorot: number | null;
}

// WooCommerce signs the raw body: base64(HMAC-SHA256(body, webhook secret)).
export function signatureValid(rawBody: string, signature: string | null, secret: string | undefined): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("base64");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const PAID_STATUSES = new Set(["processing", "completed"]);
const REVOKED_STATUSES = new Set(["refunded", "cancelled", "failed"]);

export function isPaid(order: WooOrder): boolean {
  return PAID_STATUSES.has(order.status);
}

export function isRevoked(order: WooOrder): boolean {
  return REVOKED_STATUSES.has(order.status);
}

export function externalIdFor(order: WooOrder): string {
  return `woo:${order.id}`;
}

/**
 * A paid order only counts when it is for our product (WOOCOMMERCE_PRODUCT_ID,
 * when set) and the total reaches the minimum price (WOOCOMMERCE_MIN_TOTAL,
 * in ILS, default 149), so a cheap unrelated order never grants a credit.
 */
export function toConfirmedPayment(order: WooOrder): ConfirmedPayment | null {
  if (!isPaid(order)) return null;

  const productId = process.env.WOOCOMMERCE_PRODUCT_ID;
  if (productId && !order.line_items?.some((li) => String(li.product_id) === productId)) return null;

  const total = Number(order.total);
  const minTotal = Number(process.env.WOOCOMMERCE_MIN_TOTAL ?? "149");
  if (!Number.isFinite(total) || total < minTotal) return null;

  return {
    externalId: externalIdFor(order),
    email: order.billing?.email?.trim() || null,
    amountAgorot: Math.round(total * 100),
  };
}
