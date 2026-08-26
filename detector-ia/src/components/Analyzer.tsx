"use client";

import { useState } from "react";
import Link from "next/link";
import AdSlot from "./AdSlot";
import type { AnalysisResult } from "@/lib/heuristics";

interface Props {
  initialPlan: "gratis" | "pago";
  initialRemaining: number | null;
  limit: number | null;
  maxChars: number;
}

const VERDICT_STYLES: Record
  AnalysisResult["verdict"],
  { badge: string; bar: string; ring: string }
> = {
  humano: {
    badge: "bg-accent-soft text-accent-strong",
    bar: "bg-accent",
    ring: "border-accent/40",
  },
  mixto: {
    badge: "bg-warn-soft text-warn",
    bar: "bg-warn",
    ring: "border-warn/40",
  },
  ia: {
    badge: "bg-danger-soft text-danger",
    bar: "bg-danger",
    ring: "border-danger/40",
  },
};

export default function Analyzer({
  initialPlan,
  initialRemaining,
  limit,
  maxChars,
}: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [plan] = useState(initialPlan);
  const [remaining, setRemaining] = useState<number | null>(initialRemaining);
  const [extracting, setExtracting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const charCount = text.length;
  const overLimit = charCount > maxChars;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo si hace falta
    if (!file) return;

    setFileError(null);
    setError(null);
    setResult(null);
    setExtracting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/extract-file", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setFileError(data.error || "No se pudo leer el archivo.");
        return;
      }
      setText(data.text);
    } catch {
      setFileError("No se pudo conectar con el servidor. Intenta de nuevo.");
    } finally {
      setExtracting(false);
    }
  }

  async function handleAnalyze() {
    if (!text.trim() || loading || overLimit) return;
    setLoading(true);
    setError(null);
    setErrorCode(null);
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ocurrió un error al analizar el texto.");
        setErrorCode(data.code || null);
        if (typeof data.remaining === "number") setRemaining(data.remaining);
        return;
      }
      setResult(data.result);
      if (typeof data.remaining === "number") setRemaining(data.remaining);
    } catch {
      setError("No se pudo conectar con el servidor. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-surface shadow-sm p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <label htmlFor="text-input" className="text-sm font-medium text-muted">
            Pega el texto que quieres analizar
          </label>
          {plan === "gratis" ? (
            <span className="text-xs text-muted whitespace-nowrap">
              {remaining !== null ? (
                <>
                  Te quedan <strong className="text-foreground">{remaining}</strong> de{" "}
                  {limit} análisis gratis hoy
                </>
              ) : (
                "Cargando uso..."
              )}
            </span>
          ) : (
            <span className="text-xs font-medium text-accent">
              Análisis ilimitados
            </span>
          )}
        </div>

        <textarea
          id="text-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder="Pega aquí un párrafo, ensayo o artículo (mínimo ~50 palabras para un resultado con sentido)…"
          className="w-full resize-y rounded-lg border border-border bg-background px-4 py-3 text-[15px] leading-relaxed outline-none focus:border-accent transition-colors"
        />

        <div className="mt-2 flex items-center gap-2">
          <label
            htmlFor="file-input"
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
              extracting
                ? "text-muted cursor-not-allowed"
                : "text-accent hover:underline cursor-pointer"
            }`}
          >
            {extracting ? "Leyendo archivo…" : "📎 O sube un archivo (.docx, .pdf, .txt)"}
          </label>
          <input
            id="file-input"
            type="file"
            accept=".docx,.pdf,.txt"
            onChange={handleFileChange}
            disabled={extracting}
            className="hidden"
          />
        </div>

        {fileError && (
          <div className="mt-2 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
            {fileError}
          </div>
        )}

        <div className="mt-2 flex items-center justify-between text-xs text-muted">
          <span className={overLimit ? "text-danger font-medium" : ""}>
            {charCount.toLocaleString("es")} / {maxChars.toLocaleString("es")} caracteres
          </span>
          {plan === "gratis" && (
            <Link href="/precios" className="text-accent hover:underline">
              ¿Textos más largos? Ver plan sin límite
            </Link>
          )}
        </div>

        {overLimit && text.trim() && (
          <div className="mt-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
            Este texto tiene {charCount.toLocaleString("es")} caracteres, más de los{" "}
            {maxChars.toLocaleString("es")} que permite tu plan
            {plan === "gratis" ? " gratis" : ""}. Por eso el botón de abajo está
            desactivado — acorta el texto{plan === "gratis" ? ", o" : ""}
            {plan === "gratis" && (
              <>
                {" "}
                <Link href="/precios" className="underline font-medium">
                  pasa al plan sin límite
                </Link>
              </>
            )}
            {plan === "gratis" ? "" : "."}
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={loading || !text.trim() || overLimit || remaining === 0}
          className="mt-4 w-full sm:w-auto rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-strong disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading
            ? "Analizando…"
            : overLimit
            ? "Texto demasiado largo"
            : "Analizar texto"}
        </button>

        {error && (
          <div className="mt-4 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
            {(errorCode === "DAILY_LIMIT_REACHED" || errorCode === "TEXT_TOO_LONG") && (
              <>
                {" "}
                <Link href="/precios" className="underline font-medium">
                  Ver plan sin límite
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {result && (
        <div
          className={`rounded-xl border ${VERDICT_STYLES[result.verdict].ring} bg-surface shadow-sm p-5 sm:p-6 space-y-5`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${VERDICT_STYLES[result.verdict].badge}`}
            >
              {result.verdictLabel}
            </span>
            <span className="text-xs font-mono text-muted">
              Puntaje: {Math.round(result.finalScore * 100)} / 100
            </span>
            <span className="text-xs text-muted">
              {result.wordCount.toLocaleString("es")} palabras · {result.sentenceCount}{" "}
              oraciones · idioma detectado: {result.lang === "es" ? "español" : "inglés"}
            </span>
          </div>

          <div>
            <div className="relative h-3 w-full rounded-full bg-border overflow-hidden">
              <div
                className={`h-full ${VERDICT_STYLES[result.verdict].bar} transition-all`}
                style={{
                  width: `${Math.max(3, Math.round(result.finalScore * 100))}%`,
                }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-muted">
              <span>0 · más señales de humano</span>
              <span>100 · más señales de IA</span>
            </div>
          </div>

          {result.tooShort && (
            <p className="rounded-lg bg-warn-soft text-warn text-sm px-3 py-2">
              El texto es corto (menos de 50 palabras). Con tan poco texto, cualquier
              estimación es menos confiable — trátala con más cautela todavía.
            </p>
          )}

          {result.finalScore < 0.12 && !result.tooShort && (
            <p className="rounded-lg bg-warn-soft text-warn text-sm px-3 py-2">
              Puntaje muy bajo: ninguna de las 3 señales que revisamos (variación de
              oraciones, frases típicas de IA, estructura repetida) encontró indicios.
              Esto es una buena señal de que es humano, pero no una garantía — un texto
              de IA redactado a propósito para variar el largo de las oraciones y evitar
              frases comunes puede pasar esta prueba, igual que pasaría con cualquier
              otro detector basado en patrones (gratis o de paga). Si sospechas que el
              texto fue diseñado para evadir detección, trata este resultado con más
              cautela.
            </p>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wide">
              Señales detectadas
            </h3>
            {result.signals.map((s) => (
              <div key={s.id} className="text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{s.label}</span>
                </div>
                <p className="text-muted leading-relaxed">{s.detail}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted border-t border-border pt-4">
            Esto es una estimación basada en patrones estadísticos del texto, no una
            prueba forense. Ningún detector — incluido este — es infalible: trátalo
            como una señal más para tu criterio, nunca como prueba única, especialmente
            si vas a tomar una decisión que afecta a otra persona.
          </p>

          {plan === "gratis" && <AdSlot />}
        </div>
      )}
    </div>
  );
}
