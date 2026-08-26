// Manejo del "plan" del usuario a través de una cookie firmada.
//
// No hay sistema de cuentas con usuario/contraseña: el acceso al plan de pago
// se otorga a través de una cookie firmada (HMAC) que contiene el email y una
// fecha de expiración. Se emite después de un pago exitoso con Polar (ver
// /api/polar/webhook y /api/unlock). Firmar la cookie evita que alguien la
// fabrique a mano para obtener acceso gratis.

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "detector_plan";
const SECRET = process.env.PLAN_COOKIE_SECRET || "dev-secret-cambia-esto";
const PAID_COOKIE_DAYS = 35; // un poco más que un ciclo mensual

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function buildPlanCookieValue(email: string): string {
  const expiresAt = Date.now() + PAID_COOKIE_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${email.toLowerCase()}|${expiresAt}`;
  const sig = sign(payload);
  return Buffer.from(`${payload}|${sig}`).toString("base64url");
}

export function verifyPlanCookieValue(
  value: string
): { email: string; expiresAt: number } | null {
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const parts = decoded.split("|");
    if (parts.length !== 3) return null;
    const [email, expiresAtStr, sig] = parts;
    const expected = sign(`${email}|${expiresAtStr}`);
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expected);
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null;
    const expiresAt = Number(expiresAtStr);
    if (Number.isNaN(expiresAt) || expiresAt < Date.now()) return null;
    return { email, expiresAt };
  } catch {
    return null;
  }
}

export async function getPlanFromCookies(): Promise<"gratis" | "pago"> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return "gratis";
  const parsed = verifyPlanCookieValue(raw);
  return parsed ? "pago" : "gratis";
}

export const PLAN_COOKIE_NAME = COOKIE_NAME;
export const PLAN_COOKIE_MAX_AGE = PAID_COOKIE_DAYS * 24 * 60 * 60;
