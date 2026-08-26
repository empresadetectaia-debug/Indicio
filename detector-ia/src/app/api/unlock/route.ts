import { NextRequest, NextResponse } from "next/server";
import { getPolarCheckout, isPolarConfigured } from "@/lib/polar";
import { usageStore } from "@/lib/store";
import { buildPlanCookieValue, PLAN_COOKIE_MAX_AGE, PLAN_COOKIE_NAME } from "@/lib/plan";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const checkoutId: string | undefined = body?.checkoutId;
  const email: string | undefined = body?.email;

  // Camino 1: recién volviendo de un checkout exitoso de Polar.
  if (checkoutId) {
    if (!isPolarConfigured()) {
      return NextResponse.json({ error: "Polar no configurado." }, { status: 501 });
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
    if (!checkout.email) {
      return NextResponse.json(
        { error: "No se pudo obtener el email del pago." },
        { status: 500 }
      );
    }
    await usageStore.markPaid(checkout.email);
    const res = NextResponse.json({ ok: true, email: checkout.email });
    res.cookies.set(PLAN_COOKIE_NAME, buildPlanCookieValue(checkout.email), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: PLAN_COOKIE_MAX_AGE,
      path: "/",
    });
    return res;
  }

  // Camino 2: la persona ya pagó antes (otro navegador/dispositivo) y quiere
  // recuperar su acceso ingresando el email con el que compró.
  if (email) {
    const paid = await usageStore.isPaid(email);
    if (!paid) {
      return NextResponse.json(
        {
          error:
            "No encontramos un pago activo con ese email. Si acabas de pagar, puede tardar unos segundos en confirmarse.",
        },
        { status: 404 }
      );
    }
    const res = NextResponse.json({ ok: true, email });
    res.cookies.set(PLAN_COOKIE_NAME, buildPlanCookieValue(email), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: PLAN_COOKIE_MAX_AGE,
      path: "/",
    });
    return res;
  }

  return NextResponse.json(
    { error: "Falta checkoutId o email." },
    { status: 400 }
  );
}
