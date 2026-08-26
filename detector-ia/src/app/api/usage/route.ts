import { NextRequest, NextResponse } from "next/server";
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

export async function GET(req: NextRequest) {
  const plan = await getPlanFromCookies();
  const limits = LIMITS[plan];

  if (plan === "pago") {
    return NextResponse.json({ plan, remaining: null, limit: null });
  }

  const uid = req.cookies.get(UID_COOKIE)?.value;
  if (!uid) {
    return NextResponse.json({
      plan,
      remaining: limits.analysesPerDay,
      limit: limits.analysesPerDay,
    });
  }

  const ip = getClientIp(req);
  const usageKey = `${ip}:${uid}`;
  const count = await usageStore.getDaily(usageKey);

  return NextResponse.json({
    plan,
    remaining: Math.max(0, limits.analysesPerDay - count),
    limit: limits.analysesPerDay,
  });
}
