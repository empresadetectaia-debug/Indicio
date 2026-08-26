import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto max-w-5xl px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="font-serif-heading text-xl font-semibold tracking-tight">
            Indicio
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-muted">
          <Link href="/#como-funciona" className="hover:text-foreground transition-colors">
            Cómo funciona
          </Link>
          <Link href="/precios" className="hover:text-foreground transition-colors">
            Precios
          </Link>
          <Link
            href="/precios"
            className="rounded-full bg-accent px-4 py-2 text-white hover:bg-accent-strong transition-colors"
          >
            Plan sin límite
          </Link>
        </nav>
      </div>
    </header>
  );
}
