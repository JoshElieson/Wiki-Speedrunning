import { Skeleton } from "@/components/ui/skeleton";

export function RacePageSkeleton() {
  return (
    <section
      className="mx-auto w-full max-w-6xl px-6 py-8 md:py-10"
      aria-busy="true"
      aria-label="Loading race page"
    >
      <header className="mb-6 space-y-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </header>

      <div className="mb-6 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-8 w-36" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-24" />
        ))}
      </div>

      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)] p-5">
        <div className="flex items-start gap-4">
          <Skeleton className="h-14 w-14 shrink-0" />
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full max-w-lg" />
            <div className="grid gap-px overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-16 rounded-none" />
              ))}
            </div>
          </div>
        </div>
        <Skeleton className="mt-5 h-10 w-full max-w-xs" />
      </div>
    </section>
  );
}
