export default function AdSlot({ label = "Espacio publicitario" }: { label?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface/50 px-4 py-6 text-center text-xs text-muted">
      {label}
      <div className="mt-1 text-[11px] opacity-70">
        Visible en el plan gratis · desaparece en el plan sin límite
      </div>
    </div>
  );
}
