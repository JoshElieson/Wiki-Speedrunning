"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { ArticleCard } from "@/components/presentation/article-card";
import { EmptyPanel } from "@/components/presentation/state-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProfileSnapshot } from "@/types/domain";
import { formatDuration } from "@/utils/format";
import {
  defaultRunHistoryFilters,
  filterRunHistory,
  hasActiveRunHistoryFilters,
  type RunHistoryClickFilter,
  type RunHistoryDurationFilter,
  type RunHistoryFilterState,
  type RunHistorySort,
  type RunHistoryStatusFilter,
} from "@/utils/filter-run-history";
import { cn } from "@/utils/cn";

type ProfileRun = ProfileSnapshot["recentRuns"][number];

function runStatusLabel(status: ProfileRun["status"]) {
  if (status === "ABANDONED") {
    return "Abandoned";
  }
  if (status === "DISQUALIFIED") {
    return "Disqualified";
  }
  return "Completed";
}

function runStatusVariant(status: ProfileRun["status"]) {
  if (status === "ABANDONED") {
    return "danger" as const;
  }
  if (status === "DISQUALIFIED") {
    return "neutral" as const;
  }
  return "success" as const;
}

const fieldClassName =
  "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]";

interface FilterSelectProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}

function FilterSelect<T extends string>({ label, value, onChange, options }: FilterSelectProps<T>) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">{label}</span>
      <select className={fieldClassName} value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function RunHistoryPanel({ runs }: { runs: ProfileSnapshot["recentRuns"] }) {
  const [filters, setFilters] = useState<RunHistoryFilterState>(defaultRunHistoryFilters);

  const filteredRuns = useMemo(() => filterRunHistory(runs, filters), [runs, filters]);
  const filtersActive = hasActiveRunHistoryFilters(filters);

  const updateFilter = <K extends keyof RunHistoryFilterState>(key: K, value: RunHistoryFilterState[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  if (runs.length === 0) {
    return (
      <EmptyPanel title="No runs yet" message="Finish or abandon a race to start building your run history." />
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Recent runs</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Search and filter your last {runs.length} recorded races.
          </p>
        </div>
        {filtersActive ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setFilters(defaultRunHistoryFilters)}>
            <X size={14} />
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="mt-4 space-y-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">Search</span>
          <span className="relative flex">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="search"
              value={filters.query}
              onChange={(event) => updateFilter("query", event.target.value)}
              placeholder="Challenge name, article, or status…"
              className={cn(fieldClassName, "pl-9")}
            />
          </span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect<RunHistoryStatusFilter>
            label="Status"
            value={filters.status}
            onChange={(value) => updateFilter("status", value)}
            options={[
              { value: "all", label: "All statuses" },
              { value: "COMPLETED", label: "Completed" },
              { value: "ABANDONED", label: "Abandoned" },
              { value: "DISQUALIFIED", label: "Disqualified" },
            ]}
          />
          <FilterSelect<RunHistorySort>
            label="Sort"
            value={filters.sort}
            onChange={(value) => updateFilter("sort", value)}
            options={[
              { value: "newest", label: "Newest first" },
              { value: "oldest", label: "Oldest first" },
              { value: "fastest", label: "Fastest time" },
              { value: "slowest", label: "Slowest time" },
              { value: "most-clicks", label: "Most clicks" },
              { value: "fewest-clicks", label: "Fewest clicks" },
            ]}
          />
          <FilterSelect<RunHistoryDurationFilter>
            label="Duration"
            value={filters.duration}
            onChange={(value) => updateFilter("duration", value)}
            options={[
              { value: "any", label: "Any duration" },
              { value: "under-60", label: "Under 1 minute" },
              { value: "60-180", label: "1–3 minutes" },
              { value: "over-180", label: "Over 3 minutes" },
            ]}
          />
          <FilterSelect<RunHistoryClickFilter>
            label="Clicks"
            value={filters.clicks}
            onChange={(value) => updateFilter("clicks", value)}
            options={[
              { value: "any", label: "Any click count" },
              { value: "0-5", label: "0–5 clicks" },
              { value: "6-10", label: "6–10 clicks" },
              { value: "11-plus", label: "11+ clicks" },
            ]}
          />
        </div>
      </div>

      <p className="mt-4 text-sm text-[var(--muted)]">
        Showing {filteredRuns.length} of {runs.length} runs
      </p>

      {filteredRuns.length === 0 ? (
        <div className="mt-3">
          <EmptyPanel
            title="No matching runs"
            message="Try clearing filters or broadening your search terms."
          />
        </div>
      ) : (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {filteredRuns.map((run) => (
            <Link key={run.id} href={`/runs/${run.id}`} className="block">
              <ArticleCard
                title={run.challengeLabel}
                description={`${formatDuration(run.durationMs)} · ${run.clickCount} clicks · score ${run.score}`}
                meta={
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge variant={runStatusVariant(run.status)}>{runStatusLabel(run.status)}</Badge>
                    <span>{new Date(run.createdAt).toLocaleString()}</span>
                  </span>
                }
              />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
