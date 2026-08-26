import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { UpgradeButton, UnlockByEmail } from "@/components/PricingActions";
import { LIMITS } from "@/lib/limits";

export const metadata = { title: "Precios — Indicio" };

export default function PreciosPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-6 pt-14 pb-6 text-center">
          <h1 className="font-serif-heading text-4xl font-semibold tracking-tight">
            Precios simples
          </h1>
          <p className="mt-3 text-muted max-w-xl mx-auto">
            Empieza gratis. Si lo usas seguido, el plan sin límite te ahorra tiempo y
            quita las restricciones.
          </p>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-10 grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-6 flex flex-col">
            <h2 className="font-serif-heading text-xl font-semibold">Gratis</h2>
            <p className="mt-1 text-3xl font-semibold">
              $0<span className="text-base font-normal text-muted"> /siempre</span>
            </p>
            <ul className="mt-6 space-y-3 text-sm flex-1">
              <li>✓ {LIMITS.gratis.analysesPerDay} análisis por día</li>
              <li>✓ Hasta {LIMITS.gratis.maxChars.toLocaleString("es")} caracteres por texto</li>
              <li>✓ Las 3 señales de detección estadística</li>
              <li className="text-muted">Incluye anuncios</li>
            </ul>
            <p className="mt-6 text-sm text-muted">Ya estás en este plan al entrar al sitio.</p>
          </div>

          <div className="rounded-xl border-2 border-accent bg-surface p-6 flex flex-col relative">
            <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-1 text-xs font-medium text-white">
              Sin límite
            </span>
            <h2 className="font-serif-heading text-xl font-semibold">Plan sin límite</h2>
            <p className="mt-1 text-3xl font-semibold">
              $9<span className="text-base font-normal text-muted"> USD /mes</span>
            </p>
            <ul className="mt-6 space-y-3 text-sm flex-1">
              <li>✓ Análisis ilimitados, todos los días</li>
              <li>✓ Hasta {LIMITS.pago.maxChars.toLocaleString("es")} caracteres por texto — documentos completos</li>
              <li>✓ Revisión por lotes (varios textos a la vez)</li>
              <li>✓ Sin anuncios</li>
            </ul>
            <div className="mt-6">
              <UpgradeButton />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 pb-16 text-center">
          <UnlockByEmail />
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-3xl px-6 py-14">
            <h2 className="font-serif-heading text-xl font-semibold mb-4">Preguntas frecuentes</h2>
            <div className="space-y-5 text-sm">
              <div>
                <p className="font-medium">¿Esto detecta IA con 100% de certeza?</p>
                <p className="text-muted mt-1 leading-relaxed">
                  No, y desconfía de cualquier herramienta que lo prometa. Indicio da una
                  estimación basada en patrones estadísticos del texto. Es una señal más
                  para tu criterio, no una prueba definitiva.
                </p>
              </div>
              <div>
                <p className="font-medium">¿Puedo cancelar cuando quiera?</p>
                <p className="text-muted mt-1 leading-relaxed">
                  Sí, el plan sin límite es una suscripción mensual sin permanencia
                  forzosa.
                </p>
              </div>
              <div>
                <p className="font-medium">Pagué pero mi navegador no lo reconoce, ¿qué hago?</p>
                <p className="text-muted mt-1 leading-relaxed">
                  Usa "¿Ya pagaste desde otro dispositivo?" arriba con el email de tu
                  compra para reactivar el acceso en ese navegador.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
