import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { analyzeText } from "@/lib/heuristics";
import { usageStore } from "@/lib/store";
import { getPlanFromCookies } from "@/lib/plan";
import { LIMITS } from "@/lib/limits";

export const runtime = "nodejs";

const UID_COOKIE = "detector_uid";

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const text: string = typeof body?.text === "string" ? body.text : "";

  if (!text || text.trim().length === 0) {
    return NextResponse.json(
      { error: "Pega un texto para analizar." },
      { status: 400 }
    );
  }

  const plan = await getPlanFromCookies();
  const limits = LIMITS[plan];

  if (text.length > limits.maxChars) {
    return NextResponse.json(
      {
        error:
          plan === "gratis"
            ? `El plan gratis admite hasta ${limits.maxChars.toLocaleString(
                "es"
              )} caracteres por análisis. Este texto tiene ${text.length.toLocaleString(
                "es"
              )}. Actualiza al plan sin límite para textos más largos.`
            : `Este texto supera el máximo permitido (${limits.maxChars.toLocaleString(
                "es"
              )} caracteres).`,
        code: "TEXT_TOO_LONG",
      },
      { status: 413 }
    );
  }

  let uid = req.cookies.get(UID_COOKIE)?.value;
  const isNewUid = !uid;
  if (!uid) uid = randomUUID();

  const ip = getClientIp(req);
  const usageKey = `${ip}:${uid}`;

  let remaining: number | null = null;

  if (plan === "gratis") {
    const currentCount = await usageStore.getDaily(usageKey);
    if (currentCount >= limits.analysesPerDay) {
      const res = NextResponse.json(
        {
          error:
            "Llegaste al límite de análisis gratis por hoy. Vuelve mañana o pasa al plan sin límite.",
          code: "DAILY_LIMIT_REACHED",
          remaining: 0,
          limit: limits.analysesPerDay,
        },
        { status: 429 }
      );
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
    const newCount = await usageStore.incrementDaily(usageKey);
    remaining = Math.max(0, limits.analysesPerDay - newCount);
  }

  const result = analyzeText(text);

  const res = NextResponse.json({
    result,
    plan,
    remaining,
    limit: plan === "gratis" ? limits.analysesPerDay : null,
  });

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
