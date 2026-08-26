import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border mt-auto">
      <div className="mx-auto max-w-5xl px-6 py-10 text-sm text-muted flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md">
          Indicio da una estimación estadística, no un veredicto. Úsalo como una
          señal más para tu criterio, nunca como prueba única.
        </p>
        <div className="flex gap-6">
          <Link href="/precios" className="hover:text-foreground transition-colors">
            Precios
          </Link>
          <Link href="/#como-funciona" className="hover:text-foreground transition-colors">
            Cómo funciona
          </Link>
        </div>
      </div>
    </footer>
  );
}
