import { NextResponse } from "next/server";
import { createPolarCheckout, isPolarConfigured } from "@/lib/polar";

export const runtime = "nodejs";

export async function POST() {
  if (!isPolarConfigured()) {
    return NextResponse.json(
      {
        error:
          "El cobro todavía no está configurado. Agrega POLAR_ACCESS_TOKEN y POLAR_PRODUCT_ID en las variables de entorno.",
      },
      { status: 501 }
    );
  }

  const result = await createPolarCheckout();
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ url: result.url });
}
