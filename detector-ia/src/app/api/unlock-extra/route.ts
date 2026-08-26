import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getPolarCheckout, isPolarExtraConfigured } from "@/lib/polar";
import { usageStore } from "@/lib/store";

export const runtime = "nodejs";

const UID_COOKIE = "detector_uid";

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

// Confirma un pago único de "1 análisis extra" y le da el crédito al mismo
// navegador que pagó (identificado por la cookie detector_uid + IP, igual
// que el contador diario en /api/analyze). A diferencia del plan sin límite,
// este crédito NO se asocia a un email — es intencional: es un desbloqueo
// rápido para un caso puntual, no requiere recordar quién pagó después.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const checkoutId: string | undefined = body?.checkoutId;

  if (!checkoutId) {
    return NextResponse.json({ error: "Falta checkoutId." }, { status: 400 });
  }
  if (!isPolarExtraConfigured()) {
    return NextResponse.json(
      { error: "La compra de análisis extra no está configurada." },
      { status: 501 }
    );
  }

  const checkout = await getPolarCheckout(checkoutId);
  if ("error" in checkout) {
    return NextResponse.json({ error: checkout.error }, { status: 502 });
  }
  if (checkout.status !== "succeeded" && checkout.status !== "confirmed") {
    return NextResponse.json(
      { error: `El pago todavía no se confirma (estado: ${checkout.status}).` },
      { status: 409 }
    );
  }

  let uid = req.cookies.get(UID_COOKIE)?.value;
  const isNewUid = !uid;
  if (!uid) uid = randomUUID();
  const ip = getClientIp(req);
  const usageKey = `${ip}:${uid}`;

  await usageStore.grantExtraCredits(usageKey, 1);

  const res = NextResponse.json({ ok: true });
  if (isNewUid) {
    res.cookies.set(UID_COOKIE, uid, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 400,
      path: "/",
    });
  }
  return res;
}
