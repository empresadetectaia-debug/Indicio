export const LIMITS = {
  gratis: {
    analysesPerDay: 3,
    maxChars: 4000, // ~600-700 palabras
  },
  pago: {
    analysesPerDay: Infinity,
    maxChars: 60000, // documentos completos
  },
} as const;

export type PlanId = keyof typeof LIMITS;
