import { NextResponse } from "next/server";
import { createPolarExtraCheckout, isPolarExtraConfigured } from "@/lib/polar";

export const runtime = "nodejs";

export async function POST() {
  if (!isPolarExtraConfigured()) {
    return NextResponse.json(
      {
        error:
          "La compra de análisis extra todavía no está configurada. Agrega POLAR_EXTRA_PRODUCT_ID en las variables de entorno.",
      },
      { status: 501 }
    );
  }

  const result = await createPolarExtraCheckout();
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ url: result.url });
}
