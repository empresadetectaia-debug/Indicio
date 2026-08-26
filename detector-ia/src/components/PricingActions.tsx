"use client";

import { useState } from "react";

export function UpgradeButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo iniciar el pago.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-strong disabled:opacity-50"
      >
        {loading ? "Redirigiendo…" : "Pasar al plan sin límite"}
      </button>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function UnlockByEmail() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ ok: false, text: data.error || "No se pudo verificar el pago." });
        return;
      }
      setMessage({ ok: true, text: "¡Listo! Tu plan sin límite ya está activo en este navegador." });
    } catch {
      setMessage({ ok: false, text: "No se pudo conectar con el servidor." });
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-muted hover:text-accent underline underline-offset-2"
      >
        ¿Ya pagaste desde otro dispositivo? Recupera tu acceso
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm space-y-2">
      <label className="block text-sm text-muted">
        Ingresa el email con el que pagaste
      </label>
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
        >
          {loading ? "..." : "Verificar"}
        </button>
      </div>
      {message && (
        <p className={`text-xs ${message.ok ? "text-accent" : "text-danger"}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}
