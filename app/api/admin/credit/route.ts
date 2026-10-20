import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { grantCredit } from "@/lib/access";
import { secretMatches } from "@/lib/grow";

// Manually issue one analysis credit (testing, gifts, or until the Grow webhook is live).
//   curl -X POST https://<host>/api/admin/credit -H "x-admin-secret: $ADMIN_SECRET" \
//        -H "content-type: application/json" -d '{"email":"a@b.co"}'
export async function POST(req: NextRequest) {
  if (!secretMatches(req.headers.get("x-admin-secret"), process.env.ADMIN_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const { token } = await grantCredit({
    externalId: `manual:${randomUUID()}`,
    email: body.email ?? null,
    source: "manual",
  });
  return NextResponse.json({ token, url: `${req.nextUrl.origin}/?t=${token}` });
}
