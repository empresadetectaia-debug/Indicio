// Integración con Polar (pasarela de pago para el plan sin límite).
//
// No se agrega el SDK completo de Polar para mantener el proyecto ligero:
// se usa fetch directo contra su API REST. Requiere estas variables de
// entorno (ver README):
//   POLAR_ACCESS_TOKEN   - token de acceso de tu organización en Polar
//   POLAR_PRODUCT_ID     - id del producto/precio "Plan sin límite"
//   POLAR_WEBHOOK_SECRET - secreto para verificar la firma de los webhooks
//   POLAR_SERVER         - "production" o "sandbox" (default: sandbox)
//   NEXT_PUBLIC_SITE_URL - URL pública del sitio, para las redirecciones

import { createHmac, timingSafeEqual } from "crypto";

export function isPolarConfigured(): boolean {
  return !!process.env.POLAR_ACCESS_TOKEN && !!process.env.POLAR_PRODUCT_ID;
}

/** Producto opcional de compra individual ("1 análisis extra", pago único). */
export function isPolarExtraConfigured(): boolean {
  return !!process.env.POLAR_ACCESS_TOKEN && !!process.env.POLAR_EXTRA_PRODUCT_ID;
}

function apiBase(): string {
  return process.env.POLAR_SERVER === "production"
    ? "https://api.polar.sh"
    : "https://sandbox-api.polar.sh";
}

async function createCheckoutForProduct(
  productId: string,
  successUrl: string
): Promise<{ url: string } | { error: string }> {
  try {
    const res = await fetch(`${apiBase()}/v1/checkouts/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        products: [productId],
        success_url: successUrl,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { error: `Polar respondió ${res.status}: ${text}` };
    }
    const data = await res.json();
    if (!data.url) return { error: "Polar no devolvió una URL de checkout." };
    return { url: data.url as string };
  } catch (err) {
    return { error: `No se pudo contactar a Polar: ${(err as Error).message}` };
  }
}

export async function createPolarCheckout(): Promise
  { url: string } | { error: string }
> {
  if (!isPolarConfigured()) {
    return { error: "Polar no está configurado todavía." };
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return createCheckoutForProduct(
    process.env.POLAR_PRODUCT_ID!,
    `${siteUrl}/pago-exitoso?checkout_id={CHECKOUT_ID}`
  );
}

/** Checkout de pago único para "1 análisis extra" (sin suscripción). */
export async function createPolarExtraCheckout(): Promise
  { url: string } | { error: string }
> {
  if (!isPolarExtraConfigured()) {
    return { error: "La compra individual todavía no está configurada." };
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return createCheckoutForProduct(
    process.env.POLAR_EXTRA_PRODUCT_ID!,
    `${siteUrl}/pago-exitoso?checkout_id={CHECKOUT_ID}&type=extra`
  );
}

export async function getPolarCheckout(checkoutId: string): Promise
  { email: string | null; status: string } | { error: string }
> {
  if (!isPolarConfigured()) return { error: "Polar no está configurado todavía." };
  try {
    const res = await fetch(`${apiBase()}/v1/checkouts/${checkoutId}`, {
      headers: { Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}` },
    });
    if (!res.ok) return { error: `Polar respondió ${res.status}` };
    const data = await res.json();
    return {
      email: data.customer_email ?? data.customer?.email ?? null,
      status: data.status ?? "unknown",
    };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

/**
 * Verifica la firma del webhook de Polar (estándar Svix: webhook-id,
 * webhook-timestamp, webhook-signature). Devuelve true si es válida.
 */
export function verifyPolarWebhookSignature(
  rawBody: string,
  headers: { id: string; timestamp: string; signature: string }
): boolean {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) return false;
  try {
    const secretBytes = Buffer.from(secret.split("_").pop() || secret, "base64");
    const signedContent = `${headers.id}.${headers.timestamp}.${rawBody}`;
    const expected = createHmac("sha256", secretBytes)
      .update(signedContent)
      .digest("base64");
    const candidates = headers.signature
      .split(" ")
      .map((s) => s.split(",")[1])
      .filter(Boolean);
    return candidates.some((c) => {
      try {
        const a = Buffer.from(c);
        const b = Buffer.from(expected);
        return a.length === b.length && timingSafeEqual(a, b);
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}
