// Capa de almacenamiento para el contador de uso diario y el estado de pago.
//
// Si están configuradas las variables UPSTASH_REDIS_REST_URL y
// UPSTASH_REDIS_REST_TOKEN, se usa Upstash Redis (recomendado en producción,
// ya que las funciones serverless de Vercel no comparten memoria entre
// invocaciones). Si no están configuradas, se usa un mapa en memoria como
// respaldo: funciona para probar localmente, pero en producción real cada
// "cold start" puede perder los contadores. Ver README para configurarlo.

import { Redis } from "@upstash/redis";

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;
if (hasUpstash) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

// --- Fallback en memoria (solo para desarrollo local) ---
type MemEntry = { value: number; expiresAt: number };
const memCounters = new Map<string, MemEntry>();
const memSets = new Map<string, Set<string>>();
const memExtraCredits = new Map<string, number>();

function memIncrWithTTL(key: string, ttlSeconds: number): number {
  const now = Date.now();
  const existing = memCounters.get(key);
  if (existing && existing.expiresAt > now) {
    existing.value += 1;
    return existing.value;
  }
  memCounters.set(key, { value: 1, expiresAt: now + ttlSeconds * 1000 });
  return 1;
}

function memGetCount(key: string): number {
  const now = Date.now();
  const existing = memCounters.get(key);
  if (existing && existing.expiresAt > now) return existing.value;
  return 0;
}

export const usageStore = {
  usingUpstash: hasUpstash,

  /** Incrementa el contador de uso diario para `key` y devuelve el nuevo total. */
  async incrementDaily(key: string): Promise<number> {
    const ttl = 60 * 60 * 24; // 24 horas
    if (redis) {
      const fullKey = `usage:${key}`;
      const count = await redis.incr(fullKey);
      if (count === 1) {
        await redis.expire(fullKey, ttl);
      }
      return count;
    }
    return memIncrWithTTL(`usage:${key}`, ttl);
  },

  /** Lee el contador actual sin incrementarlo. */
  async getDaily(key: string): Promise<number> {
    if (redis) {
      const val = await redis.get<number>(`usage:${key}`);
      return val ?? 0;
    }
    return memGetCount(`usage:${key}`);
  },

  /** Marca un email como cliente de pago (llamado desde el webhook de Polar). */
  async markPaid(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    if (redis) {
      await redis.sadd("paid_emails", normalized);
      return;
    }
    if (!memSets.has("paid_emails")) memSets.set("paid_emails", new Set());
    memSets.get("paid_emails")!.add(normalized);
  },

  /** Quita a un email de la lista de pago (cancelación / reembolso). */
  async unmarkPaid(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    if (redis) {
      await redis.srem("paid_emails", normalized);
      return;
    }
    memSets.get("paid_emails")?.delete(normalized);
  },

  /** Verifica si un email está marcado como cliente de pago. */
  async isPaid(email: string): Promise<boolean> {
    const normalized = email.trim().toLowerCase();
    if (redis) {
      const res = await redis.sismember("paid_emails", normalized);
      return res === 1;
    }
    return memSets.get("paid_emails")?.has(normalized) ?? false;
  },

  /**
   * Otorga créditos de "análisis extra" (compras individuales fuera de la
   * suscripción) a `key`. No caducan por sí solos, se consumen uno a la vez.
   */
  async grantExtraCredits(key: string, count: number): Promise<void> {
    const fullKey = `extra:${key}`;
    if (redis) {
      await redis.incrby(fullKey, count);
      return;
    }
    memExtraCredits.set(key, (memExtraCredits.get(key) ?? 0) + count);
  },

  /** Lee cuántos créditos extra le quedan a `key`, sin consumirlos. */
  async getExtraCredits(key: string): Promise<number> {
    if (redis) {
      const val = await redis.get<number>(`extra:${key}`);
      return val ?? 0;
    }
    return memExtraCredits.get(key) ?? 0;
  },

  /**
   * Intenta consumir 1 crédito extra de `key`. Devuelve true si había uno
   * disponible y se consumió, false si no quedaban.
   */
  async consumeExtraCredit(key: string): Promise<boolean> {
    const fullKey = `extra:${key}`;
    if (redis) {
      const newVal = await redis.decr(fullKey);
      if (newVal < 0) {
        // No había crédito disponible: revierte el decremento de más.
        await redis.incr(fullKey);
        return false;
      }
      return true;
    }
    const cur = memExtraCredits.get(key) ?? 0;
    if (cur <= 0) return false;
    memExtraCredits.set(key, cur - 1);
    return true;
  },
};
