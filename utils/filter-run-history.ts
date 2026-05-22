import type { ProfileSnapshot } from "@/types/domain";

export type ProfileRunHistoryItem = ProfileSnapshot["recentRuns"][number];

export type RunHistoryStatusFilter = "all" | ProfileRunHistoryItem["status"];

export type RunHistorySort = "newest" | "oldest" | "fastest" | "slowest" | "most-clicks" | "fewest-clicks";

export type RunHistoryDurationFilter = "any" | "under-60" | "60-180" | "over-180";

export type RunHistoryClickFilter = "any" | "0-5" | "6-10" | "11-plus";

export interface RunHistoryFilterState {
  query: string;
  status: RunHistoryStatusFilter;
  sort: RunHistorySort;
  duration: RunHistoryDurationFilter;
  clicks: RunHistoryClickFilter;
}

export const defaultRunHistoryFilters: RunHistoryFilterState = {
  query: "",
  status: "all",
  sort: "newest",
  duration: "any",
  clicks: "any",
};

function matchesDuration(durationMs: number, filter: RunHistoryDurationFilter): boolean {
  if (filter === "any") {
    return true;
  }
  if (filter === "under-60") {
    return durationMs < 60_000;
  }
  if (filter === "60-180") {
    return durationMs >= 60_000 && durationMs <= 180_000;
  }
  return durationMs > 180_000;
}

function matchesClicks(clickCount: number, filter: RunHistoryClickFilter): boolean {
  if (filter === "any") {
    return true;
  }
  if (filter === "0-5") {
    return clickCount <= 5;
  }
  if (filter === "6-10") {
    return clickCount >= 6 && clickCount <= 10;
  }
  return clickCount >= 11;
}

function runSearchText(run: ProfileRunHistoryItem): string {
  const routeText = run.route?.join(" ") ?? "";
  return `${run.challengeLabel} ${routeText} ${run.status}`.toLowerCase();
}

function compareRuns(a: ProfileRunHistoryItem, b: ProfileRunHistoryItem, sort: RunHistorySort): number {
  switch (sort) {
    case "oldest":
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    case "fastest":
      return a.durationMs - b.durationMs;
    case "slowest":
      return b.durationMs - a.durationMs;
    case "most-clicks":
      return b.clickCount - a.clickCount;
    case "fewest-clicks":
      return a.clickCount - b.clickCount;
    case "newest":
    default:
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }
}

export function filterRunHistory(runs: ProfileRunHistoryItem[], filters: RunHistoryFilterState): ProfileRunHistoryItem[] {
  const normalizedQuery = filters.query.trim().toLowerCase();

  const filtered = runs.filter((run) => {
    if (filters.status !== "all" && run.status !== filters.status) {
      return false;
    }
    if (!matchesDuration(run.durationMs, filters.duration)) {
      return false;
    }
    if (!matchesClicks(run.clickCount, filters.clicks)) {
      return false;
    }
    if (normalizedQuery && !runSearchText(run).includes(normalizedQuery)) {
      return false;
    }
    return true;
  });

  return [...filtered].sort((a, b) => compareRuns(a, b, filters.sort));
}

export function hasActiveRunHistoryFilters(filters: RunHistoryFilterState): boolean {
  return (
    filters.query.trim().length > 0 ||
    filters.status !== "all" ||
    filters.sort !== "newest" ||
    filters.duration !== "any" ||
    filters.clicks !== "any"
  );
}
