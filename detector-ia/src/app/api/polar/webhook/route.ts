import { NextRequest, NextResponse } from "next/server";
import { verifyPolarWebhookSignature } from "@/lib/polar";
import { usageStore } from "@/lib/store";

export const runtime = "nodejs";

// Eventos de Polar que nos interesan. Ver docs de Polar para la lista
// completa: https://docs.polar.sh/integrate/webhooks/events
//
// IMPORTANTE: "order.paid" se dispara tanto para la suscripción ("Plan sin
// límite") como para el producto de pago único ("1 análisis extra"). Solo
// debe activar el plan sin límite permanente cuando el producto comprado es
// el de la suscripción — si no, una compra de $2 activaría por error acceso
// ilimitado gratis. El crédito de "análisis extra" se otorga aparte, en
// /api/unlock-extra, justo cuando la persona vuelve del checkout.
const SUBSCRIPTION_EVENTS = new Set([
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
  const productId =
    (data as Record<string, unknown>).product_id ||
    (data.product as Record<string, unknown> | undefined)?.id ||
    null;
  const isSubscriptionProduct =
    !!process.env.POLAR_PRODUCT_ID && productId === process.env.POLAR_PRODUCT_ID;

  if (typeof email === "string") {
    if (
      SUBSCRIPTION_EVENTS.has(type) ||
      (type === "order.paid" && isSubscriptionProduct)
    ) {
      await usageStore.markPaid(email);
    } else if (REVOKE_EVENTS.has(type)) {
      await usageStore.unmarkPaid(email);
    }
  }

  return NextResponse.json({ received: true });
}
