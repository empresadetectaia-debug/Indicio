import { cookies, headers } from "next/headers";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Analyzer from "@/components/Analyzer";
import { getPlanFromCookies } from "@/lib/plan";
import { usageStore } from "@/lib/store";
import { LIMITS } from "@/lib/limits";

async function getInitialUsage() {
  const plan = await getPlanFromCookies();
  const limits = LIMITS[plan];

  if (plan === "pago") {
    return { plan, remaining: null as number | null, limit: null as number | null, maxChars: limits.maxChars };
  }

  const cookieStore = await cookies();
  const uid = cookieStore.get("detector_uid")?.value;
  const hdrs = await headers();
  const ip = (hdrs.get("x-forwarded-for") || hdrs.get("x-real-ip") || "unknown").split(",")[0].trim();

  const remaining = uid
    ? Math.max(0, limits.analysesPerDay - (await usageStore.getDaily(`${ip}:${uid}`)))
    : limits.analysesPerDay;

  return { plan, remaining, limit: limits.analysesPerDay, maxChars: limits.maxChars };
}

export default async function Home() {
  const { plan, remaining, limit, maxChars } = await getInitialUsage();

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 pt-14 pb-10">
          <div className="max-w-2xl">
            <h1 className="font-serif-heading text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">
              ¿Este texto lo escribió una persona o una IA?
            </h1>
            <p className="mt-4 text-lg text-muted leading-relaxed">
              Pega cualquier texto y recibe un análisis honesto basado en patrones
              estadísticos: variación de oraciones, frases típicas de IA y estructura
              del texto. Una señal más para tu criterio — nunca un veredicto.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-16">
          <Analyzer
            initialPlan={plan}
            initialRemaining={remaining}
            limit={limit}
            maxChars={maxChars}
          />
        </section>

        <section id="como-funciona" className="border-t border-border bg-surface/40">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <h2 className="font-serif-heading text-2xl sm:text-3xl font-semibold tracking-tight">
              Cómo funciona
            </h2>
            <p className="mt-3 max-w-2xl text-muted leading-relaxed">
              Indicio no pretende leer la mente del autor. Combina varias señales
              estadísticas del texto mismo — sin necesitar saber quién ni cómo lo
              escribió:
            </p>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              <div>
                <div className="text-sm font-semibold text-accent mb-1">01</div>
                <h3 className="font-medium mb-1">Variación de oraciones</h3>
                <p className="text-sm text-muted leading-relaxed">
                  El texto humano mezcla oraciones cortas y largas sin patrón fijo. La
                  IA tiende a ser más uniforme.
                </p>
              </div>
              <div>
                <div className="text-sm font-semibold text-accent mb-1">02</div>
                <h3 className="font-medium mb-1">Frases típicas de IA</h3>
                <p className="text-sm text-muted leading-relaxed">
                  Ciertas frases ("cabe destacar", "en definitiva", "leverage",
                  "delve into") aparecen desproporcionadamente en texto generado.
                </p>
              </div>
              <div>
                <div className="text-sm font-semibold text-accent mb-1">03</div>
                <h3 className="font-medium mb-1">Estructura repetitiva</h3>
                <p className="text-sm text-muted leading-relaxed">
                  Párrafos que empiezan siempre con conectores tipo "además" o "por
                  otro lado" de forma mecánica.
                </p>
              </div>
            </div>
            <p className="mt-8 max-w-2xl text-sm text-muted leading-relaxed border-l-2 border-accent/40 pl-4">
              Ningún detector de texto de IA — ni los comerciales más conocidos — es
              100% confiable. Funciona peor con personas que no escriben en su lengua
              materna o con textos muy formulaicos por naturaleza. Por eso mostramos un
              rango de probabilidad y las señales detrás, nunca un porcentaje con falsa
              precisión ni un "sí" o "no" tajante.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="font-serif-heading text-2xl sm:text-3xl font-semibold tracking-tight">
            ¿Para quién es esto?
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {[
              {
                title: "Estudiantes",
                text: "Revisa tu propio ensayo antes de entregarlo, para detectar si suena demasiado uniforme o formulaico.",
              },
              {
                title: "Editores",
                text: "Una revisión rápida del contenido que entregan colaboradores freelance, antes de publicarlo.",
              },
              {
                title: "Profesores",
                text: "Úsalo como una señal más entre varias, nunca como prueba única para acusar a un estudiante.",
              },
              {
                title: "Equipos de marketing",
                text: "Verifica si el contenido entregado por una agencia o freelancer necesita más edición humana.",
              },
            ].map((c) => (
              <div key={c.title} className="rounded-lg border border-border bg-surface p-5">
                <h3 className="font-medium mb-1">{c.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{c.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-accent-soft/40">
          <div className="mx-auto max-w-5xl px-6 py-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <h2 className="font-serif-heading text-2xl font-semibold tracking-tight">
                ¿Analizas texto todos los días?
              </h2>
              <p className="mt-2 text-muted max-w-md">
                El plan sin límite quita el tope diario, admite documentos completos y
                no muestra anuncios.
              </p>
            </div>
            <Link
              href="/precios"
              className="whitespace-nowrap rounded-full bg-accent px-6 py-3 text-sm font-medium text-white hover:bg-accent-strong transition-colors"
            >
              Ver precios
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
