import { Card } from "@/components/ui/card";
import { formatDuration } from "@/utils/format";

export function ResultSummaryCard({
  durationMs,
  clickCount,
  score,
  routeLength,
}: {
  durationMs: number;
  clickCount: number;
  score: number;
  routeLength: number;
}) {
  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold text-[var(--foreground)]">Run Summary</h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <SummaryTile label="Time" value={formatDuration(durationMs)} />
        <SummaryTile label="Clicks" value={`${clickCount}`} />
        <SummaryTile label="Score" value={`${score}`} />
        <SummaryTile label="Route" value={`${routeLength} nodes`} />
      </div>
    </Card>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2">
      <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}
