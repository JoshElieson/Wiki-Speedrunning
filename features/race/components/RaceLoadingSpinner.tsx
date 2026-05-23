export function RaceLoadingSpinner({ label = "Loading race" }: { label?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" aria-hidden />
      <p className="text-sm text-[var(--muted)]">{label}</p>
    </div>
  );
}
