import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { grantCredit, revokeCredit } from "@/lib/access";
import { sendAccessEmail } from "@/lib/email";
import { externalIdFor, isRevoked, signatureValid, toConfirmedPayment, type WooOrder } from "@/lib/woocommerce";

// WooCommerce → Settings → Advanced → Webhooks: topic "Order updated",
// delivery URL https://<host>/api/woocommerce/webhook, secret = WOOCOMMERCE_WEBHOOK_SECRET.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!signatureValid(raw, req.headers.get("x-wc-webhook-signature"), process.env.WOOCOMMERCE_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // On save WooCommerce sends a form-encoded "webhook_id=N" ping; acknowledge it.
  let order: WooOrder;
  try {
    order = JSON.parse(raw) as WooOrder;
  } catch {
    return NextResponse.json({ ok: true, ping: true });
  }
  if (typeof order?.id !== "number") return NextResponse.json({ ok: true, ignored: true });

  const sql = await db();
  const log = (note: string) =>
    sql`INSERT INTO grow_events (payload, handled, note)
        VALUES (${JSON.stringify({ source: "woocommerce", id: order.id, status: order.status, total: order.total })}::jsonb,
                ${note === "credit granted"}, ${note})`;

  if (isRevoked(order)) {
    const revoked = await revokeCredit(externalIdFor(order));
    await log(revoked ? "credit revoked" : "revoke: nothing to revoke");
    return NextResponse.json({ ok: true });
  }

  const payment = toConfirmedPayment(order);
  if (!payment) {
    await log("ignored: not a paid order for this product");
    return NextResponse.json({ ok: true });
  }

  const { token, created } = await grantCredit({ ...payment, source: "woocommerce" });
  if (created) {
    const accessUrl = `${req.nextUrl.origin}/?t=${token}`;
    const sent = payment.email ? await sendAccessEmail(payment.email, accessUrl) : false;
    await log(sent ? "credit granted" : `credit granted, email NOT sent — link: ${accessUrl}`);
  }
  return NextResponse.json({ ok: true });
}
