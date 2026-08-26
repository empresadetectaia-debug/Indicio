// Motor de detección heurística.
//
// Importante: esto es una ESTIMACIÓN basada en patrones estadísticos del texto,
// no una prueba forense. Ningún detector de texto de IA (comercial o no) puede
// garantizar un resultado 100% correcto. El diseño de este módulo asume que
// falsos positivos y falsos negativos van a ocurrir, y por eso el resultado
// siempre se comunica como rango de probabilidad + señales explicadas, nunca
// como un porcentaje con falsa precisión ni como un veredicto definitivo.

export type Lang = "es" | "en";

export interface SignalResult {
  id: string;
  label: string;
  score: number; // 0 a 1, 1 = más parecido a IA
  detail: string;
}

export interface AnalysisResult {
  lang: Lang;
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  finalScore: number; // 0 a 1
  verdict: "humano" | "mixto" | "ia";
  verdictLabel: string;
  signals: SignalResult[];
  tooShort: boolean;
}

const STOPWORDS_ES = [
  "el", "la", "los", "las", "de", "que", "y", "en", "un", "una", "es", "por",
  "para", "con", "no", "se", "su", "al", "lo", "como", "más", "pero", "sus",
  "le", "ya", "o", "porque", "cuando", "muy", "sin", "sobre", "también",
];
const STOPWORDS_EN = [
  "the", "of", "and", "to", "in", "a", "is", "that", "for", "on", "with",
  "as", "are", "this", "by", "an", "be", "it", "from", "or", "was", "at",
  "which", "but", "have", "not",
];

const AI_PHRASES_ES = [
  "cabe destacar", "es importante mencionar", "es importante destacar",
  "en definitiva", "sin duda alguna", "juega un papel crucial",
  "juega un papel fundamental", "a la vanguardia", "en el mundo actual",
  "en la era digital", "cabe resaltar", "vale la pena mencionar",
  "en resumen", "en última instancia", "es fundamental", "es esencial",
  "no obstante", "por otro lado", "en conclusión", "cabe señalar",
  "desempeña un papel", "resulta fundamental", "de manera significativa",
  "es crucial", "un sinfín de", "un abanico de", "diversos factores",
  "el panorama actual", "aprovechar al máximo", "impulsar el crecimiento",
];
const AI_PHRASES_EN = [
  "moreover", "furthermore", "it's worth noting", "it is worth noting",
  "delve into", "in today's landscape", "in today's world", "leverage",
  "robust", "seamless", "in conclusion", "overall", "it is important to note",
  "plays a crucial role", "plays a vital role", "at the forefront",
  "navigate the complexities", "unlock the potential", "a testament to",
  "in the realm of", "when it comes to", "let's dive in", "game changer",
  "in summary", "on the other hand", "it is essential", "myriad of",
  "underscore", "foster", "tapestry",
];

const CONNECTORS_ES = [
  "primero", "en primer lugar", "además", "por otro lado", "en conclusión",
  "en resumen", "por último", "asimismo", "cabe mencionar", "en definitiva",
  "finalmente", "por una parte", "por otra parte", "en segundo lugar",
  "para concluir", "en síntesis",
];
const CONNECTORS_EN = [
  "first", "firstly", "furthermore", "moreover", "in conclusion",
  "additionally", "on the other hand", "finally", "overall", "in summary",
  "secondly", "to conclude", "to summarize", "lastly",
];

function detectLang(text: string): Lang {
  const lower = text.toLowerCase();
  const words = lower.match(/[a-záéíóúñü]+/gi) || [];
  let esHits = 0;
  let enHits = 0;
  for (const w of words) {
    if (STOPWORDS_ES.includes(w)) esHits++;
    if (STOPWORDS_EN.includes(w)) enHits++;
  }
  // Señales fuertes de español (acentos, ñ) desempatan a favor de ES.
  if (/[ñáéíóúü]/i.test(text) && esHits >= enHits) return "es";
  return enHits > esHits ? "en" : "es";
}

function splitSentences(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  // División simple por signos de puntuación fuertes. No es perfecta con
  // abreviaturas, pero es suficiente para una señal estadística agregada.
  const parts = clean
    .split(/(?<=[.!?…])\s+(?=[A-ZÁÉÍÓÚÑ0-9¿¡"'])/g)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : [clean];
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n+/g)
    .map((p) => p.trim())
    .filter(Boolean);
}

function countWords(text: string): number {
  const m = text.match(/[\p{L}\p{N}'’-]+/gu);
  return m ? m.length : 0;
}

function stdev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const variance =
    nums.reduce((a, b) => a + (b - mean) ** 2, 0) / (nums.length - 1);
  return Math.sqrt(variance);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function countPhraseHits(lowerText: string, phrases: string[]): {
  count: number;
  matched: string[];
} {
  let count = 0;
  const matched: string[] = [];
  for (const phrase of phrases) {
    const re = new RegExp(
      `\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "gi"
    );
    const hits = lowerText.match(re);
    if (hits && hits.length) {
      count += hits.length;
      matched.push(phrase);
    }
  }
  return { count, matched };
}

export function analyzeText(rawText: string): AnalysisResult {
  const text = rawText.trim();
  const lang = detectLang(text);
  const sentences = splitSentences(text);
  const paragraphs = splitParagraphs(text).length ? splitParagraphs(text) : [text];
  const wordCount = countWords(text);
  const tooShort = wordCount < 50;

  // --- Señal 1: uniformidad de oraciones (burstiness) ---
  const sentenceLengths = sentences.map((s) => countWords(s)).filter((n) => n > 0);
  const sd = stdev(sentenceLengths);
  // stdev alta (>=8 palabras) -> muy humano (score bajo). stdev baja (<=2) -> muy uniforme (score alto).
  const burstScore = clamp(1 - (sd - 2) / 6, 0, 1);
  const signal1: SignalResult = {
    id: "burstiness",
    label:
      lang === "es"
        ? "Variación en la longitud de las oraciones"
        : "Variation in sentence length",
    score: burstScore,
    detail:
      lang === "es"
        ? `Desviación estándar de ${sd.toFixed(1)} palabras entre oraciones. ${
            sd < 4
              ? "Las oraciones son inusualmente uniformes en longitud, algo común en texto generado por IA."
              : "Hay buena variación entre oraciones cortas y largas, típico de escritura humana."
          }`
        : `Standard deviation of ${sd.toFixed(1)} words between sentences. ${
            sd < 4
              ? "Sentences are unusually uniform in length, common in AI-generated text."
              : "There's good variation between short and long sentences, typical of human writing."
          }`,
  };

  // --- Señal 2: frases típicas de IA ---
  const lowerText = text.toLowerCase();
  const phraseList = lang === "es" ? AI_PHRASES_ES : AI_PHRASES_EN;
  const { count: phraseCount, matched } = countPhraseHits(lowerText, phraseList);
  const per100 = wordCount > 0 ? (phraseCount / wordCount) * 100 : 0;
  const phraseScore = clamp(per100 / 3, 0, 1);
  const signal2: SignalResult = {
    id: "ai-phrases",
    label:
      lang === "es" ? "Frases típicas de texto generado por IA" : "Phrases typical of AI-generated text",
    score: phraseScore,
    detail:
      lang === "es"
        ? phraseCount > 0
          ? `Se encontraron ${phraseCount} frase(s) frecuentes en texto de IA, como: "${matched
              .slice(0, 3)
              .join('", "')}". Esta señal es débil por sí sola: una persona también puede usarlas.`
          : "No se encontraron frases especialmente asociadas con texto generado por IA."
        : phraseCount > 0
          ? `Found ${phraseCount} phrase(s) common in AI text, such as: "${matched
              .slice(0, 3)
              .join('", "')}". This signal alone is weak: a person can use these too.`
          : "No phrases especially associated with AI-generated text were found.",
  };

  // --- Señal 3: repetición de estructura de párrafo ---
  const nonFirstParagraphs = paragraphs.slice(1);
  const connectorList = lang === "es" ? CONNECTORS_ES : CONNECTORS_EN;
  let startsWithConnector = 0;
  for (const p of nonFirstParagraphs) {
    const firstWords = p.toLowerCase().slice(0, 40);
    if (connectorList.some((c) => firstWords.startsWith(c))) {
      startsWithConnector++;
    }
  }
  const structureScore =
    nonFirstParagraphs.length > 0
      ? clamp(startsWithConnector / nonFirstParagraphs.length, 0, 1)
      : 0;
  const signal3: SignalResult = {
    id: "structure",
    label:
      lang === "es" ? "Repetición de estructura entre párrafos" : "Repetition of structure between paragraphs",
    score: structureScore,
    detail:
      lang === "es"
        ? paragraphs.length > 1
          ? `${startsWithConnector} de ${nonFirstParagraphs.length} párrafo(s) comienzan con un conector tipo "además", "por otro lado" o "en conclusión", un patrón repetitivo típico de IA cuando es muy frecuente.`
          : "El texto tiene un solo párrafo, esta señal no aporta información adicional."
        : paragraphs.length > 1
          ? `${startsWithConnector} of ${nonFirstParagraphs.length} paragraph(s) start with a connector like "furthermore", "on the other hand" or "in conclusion" — a repetitive pattern typical of AI when very frequent.`
          : "The text has a single paragraph, this signal doesn't add extra information.",
  };

  const signals = [signal1, signal2, signal3];

  const finalScore =
    signal1.score * 0.45 + signal2.score * 0.35 + signal3.score * 0.2;

  let verdict: AnalysisResult["verdict"];
  let verdictLabel: string;
  if (finalScore < 0.35) {
    verdict = "humano";
    verdictLabel = lang === "es" ? "Probablemente humano" : "Likely human";
  } else if (finalScore < 0.65) {
    verdict = "mixto";
    verdictLabel = lang === "es" ? "Mixto / no concluyente" : "Mixed / inconclusive";
  } else {
    verdict = "ia";
    verdictLabel = lang === "es" ? "Probablemente generado por IA" : "Likely AI-generated";
  }

  return {
    lang,
    wordCount,
    sentenceCount: sentences.length,
    paragraphCount: paragraphs.length,
    finalScore,
    verdict,
    verdictLabel,
    signals,
    tooShort,
  };
}
