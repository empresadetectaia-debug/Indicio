# Indicio — Detector de texto de IA

Herramienta web que estima qué tan probable es que un texto haya sido escrito
por IA, usando señales estadísticas (sin depender de ningún modelo de IA de
terceros). Plan gratis limitado con anuncios + plan de pago sin límite vía
Polar.

## Qué incluye

- **Detección**: 3 señales estadísticas (variación de longitud de oraciones,
  frases típicas de IA, repetición de estructura entre párrafos), combinadas
  en un resultado honesto por rangos ("probablemente humano" / "mixto" /
  "probablemente IA"), nunca un porcentaje con falsa precisión. Detecta
  automáticamente español o inglés. Código en `src/lib/heuristics.ts`.
- **Plan gratis**: 5 análisis por día por visitante (combinación de cookie +
  IP), hasta 4,000 caracteres por texto, con espacio para anuncios.
- **Plan de pago**: análisis ilimitados, hasta 60,000 caracteres, sin
  anuncios. Cobro mensual vía [Polar](https://polar.sh).
- Sin sistema de cuentas tradicional: el acceso de pago se activa con una
  cookie firmada después del checkout, y se puede recuperar en otro
  dispositivo ingresando el email de la compra.

## Antes de desplegar

1. **Instala dependencias**: `npm install`
2. **Copia `.env.example` a `.env.local`** y complétalo (ver los comentarios
   de cada variable ahí). Como mínimo, para que el sitio funcione en pruebas
   locales sin cobros reales, puedes dejar todo vacío excepto
   `PLAN_COOKIE_SECRET` (genera uno con `openssl rand -hex 32`).
3. **Corre localmente**: `npm run dev` y abre http://localhost:3000

## Desplegar en Vercel

1. Sube este proyecto a un repositorio de GitHub (o GitLab/Bitbucket).
2. En [vercel.com](https://vercel.com), "Add New Project" → importa el
   repositorio. Vercel detecta Next.js automáticamente, no hay que tocar la
   configuración de build.
3. Antes del primer deploy (o después, en Project Settings → Environment
   Variables), agrega todas las variables de `.env.example` con sus valores
   reales de producción.
4. Deploy. Verifica que el dominio tenga HTTPS (Vercel lo activa solo).

### Lo que falta configurar para cobrar de verdad

- **Upstash Redis** (`UPSTASH_REDIS_REST_URL` / `_TOKEN`): sin esto el
  contador de uso diario vive en memoria y se resetea seguido — funciona para
  probar, no para producción real. Cuenta gratis en https://upstash.com.
- **Polar** (`POLAR_ACCESS_TOKEN`, `POLAR_PRODUCT_ID`, `POLAR_WEBHOOK_SECRET`):
  crea tu cuenta y el producto de suscripción en https://polar.sh, sigue los
  pasos comentados en `.env.example`. Empieza con `POLAR_SERVER=sandbox` para
  probar el flujo de pago completo con tarjetas de prueba antes de pasar a
  `production`.
- **Google AdSense**: el componente `src/components/AdSlot.tsx` es un
  placeholder visual. Para mostrar anuncios reales necesitas: (1) que el
  sitio ya esté publicado con contenido, (2) darte de alta en
  https://adsense.google.com con ese dominio, (3) esperar la aprobación de
  Google (puede tardar días), y (4) reemplazar el contenido de `AdSlot.tsx`
  por el script/unidad de anuncio que te da AdSense.

## Estructura del proyecto

```
src/
  app/
    page.tsx                 → página principal (herramienta + explicación)
    precios/page.tsx          → planes y checkout
    pago-exitoso/page.tsx     → retorno del checkout de Polar
    api/
      analyze/route.ts        → análisis + límite diario
      usage/route.ts          → consulta de uso restante
      checkout/route.ts       → crea el checkout de Polar
      unlock/route.ts         → activa el plan de pago (cookie) tras pagar
      polar/webhook/route.ts  → recibe eventos de pago/cancelación de Polar
  components/                 → UI (Analyzer, PricingActions, AdSlot, etc.)
  lib/
    heuristics.ts              → el motor de detección
    store.ts                   → contador diario + lista de pagos (Upstash)
    plan.ts                    → cookie firmada del plan de pago
    polar.ts                   → integración con la API de Polar
    limits.ts                  → límites por plan
```

## Sobre la precisión de la detección

Ningún detector de texto de IA es infalible — ni este ni los comerciales.
Genera más falsos positivos con personas que no escriben en su lengua materna
y con textos muy formulaicos por naturaleza (reportes técnicos, resúmenes
ejecutivos). El producto está diseñado para comunicar esto de forma honesta
directamente en el resultado, no solo en un aviso legal escondido. Si en el
futuro quieres agregar una señal opcional de "segunda opinión" con un modelo
de lenguaje (por ejemplo Gemini), mantenla como una señal más entre varias,
no como reemplazo de las estadísticas.

## Ajustar las señales de detección

Las listas de frases típicas de IA y los pesos de cada señal envejecen: los
modelos cambian, el lenguaje "de IA" cambia. Revisa y actualiza
`src/lib/heuristics.ts` cada tanto (las listas `AI_PHRASES_ES` /
`AI_PHRASES_EN` y los pesos en `finalScore`).
