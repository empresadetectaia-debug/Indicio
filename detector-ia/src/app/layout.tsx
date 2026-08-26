import type { Metadata } from "next";
import "./globals.css";

// Nota: se usan pilas de fuentes del sistema (sin next/font/google) para que
// el proyecto compile sin depender de acceso a Google Fonts en build time.
// Si más adelante quieres tipografías específicas, next/font/google funciona
// igual de bien en Vercel (que sí tiene salida a internet en el build).

export const metadata: Metadata = {
  title: "Indicio — Detector de texto de IA",
  description:
    "Analiza un texto y recibe una estimación honesta de qué tan probable es que haya sido escrito por IA. Sin promesas falsas de precisión perfecta.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
