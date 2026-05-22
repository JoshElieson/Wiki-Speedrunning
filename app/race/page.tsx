import { RaceShell } from "@/features/race/components/RaceShell";

export default function RacePage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-[var(--foreground)]">Solo Race</h1>
        <p className="mt-1 text-[var(--muted)]">Traverse the Wikipedia graph as fast as possible using only internal links.</p>
      </div>
      <RaceShell />
    </main>
  );
}
