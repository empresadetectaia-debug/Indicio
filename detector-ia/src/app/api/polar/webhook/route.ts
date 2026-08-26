import { NextRequest, NextResponse } from "next/server";
import { verifyPolarWebhookSignature } from "@/lib/polar";
import { usageStore } from "@/lib/store";

export const runtime = "nodejs";

// Eventos de Polar que nos interesan. Ver docs de Polar para la lista
// completa: https://docs.polar.sh/integrate/webhooks/events
const GRANT_EVENTS = new Set([
  "order.paid",
  "subscription.created",
  "subscription.active",
]);
const REVOKE_EVENTS = new Set([
  "subscription.canceled",
  "subscription.revoked",
]);

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const id = req.headers.get("webhook-id") || "";
  const timestamp = req.headers.get("webhook-timestamp") || "";
  const signature = req.headers.get("webhook-signature") || "";

  const valid = verifyPolarWebhookSignature(rawBody, {
    id,
    timestamp,
    signature,
  });

  if (!valid) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  let event: { type?: string; data?: Record<string, unknown> } = {};
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const type = event.type || "";
  const data = event.data || {};
  const email =
    (data.customer as Record<string, unknown> | undefined)?.email ||
    (data as Record<string, unknown>).customer_email ||
    null;

  if (typeof email === "string") {
    if (GRANT_EVENTS.has(type)) {
      await usageStore.markPaid(email);
    } else if (REVOKE_EVENTS.has(type)) {
      await usageStore.unmarkPaid(email);
    }
  }

  return NextResponse.json({ received: true });
}
