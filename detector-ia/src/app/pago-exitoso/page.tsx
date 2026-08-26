"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

function PagoExitosoContent() {
  const params = useSearchParams();
  const checkoutId = params.get("checkout_id");
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!checkoutId) {
      setStatus("error");
      setMessage("Falta el identificador del pago en el enlace.");
      return;
    }
    fetch("/api/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkoutId }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setStatus("error");
          setMessage(data.error || "No se pudo confirmar el pago.");
          return;
        }
        setStatus("ok");
      })
      .catch(() => {
        setStatus("error");
        setMessage("No se pudo conectar con el servidor.");
      });
  }, [checkoutId]);

  return (
    <section className="mx-auto max-w-md px-6 py-24 text-center">
      {status === "loading" && <p className="text-muted">Confirmando tu pago…</p>}
      {status === "ok" && (
        <>
          <h1 className="font-serif-heading text-2xl font-semibold mb-3">
            ¡Listo! Ya tienes el plan sin límite
          </h1>
          <p className="text-muted mb-6">
            Tu acceso ya está activo en este navegador.
          </p>
          <Link
            href="/"
            className="inline-block rounded-full bg-accent px-6 py-3 text-sm font-medium text-white hover:bg-accent-strong"
          >
            Empezar a analizar
          </Link>
        </>
      )}
      {status === "error" && (
        <>
          <h1 className="font-serif-heading text-2xl font-semibold mb-3">
            No pudimos confirmar el pago
          </h1>
          <p className="text-muted mb-6">{message}</p>
          <Link href="/precios" className="text-accent underline">
            Volver a precios
          </Link>
        </>
      )}
    </section>
  );
}

export default function PagoExitosoPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Suspense fallback={<p className="text-center py-24 text-muted">Cargando…</p>}>
          <PagoExitosoContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
