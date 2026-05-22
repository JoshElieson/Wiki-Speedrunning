export const RACE_TIER_BANDS = [
  { label: "Bronze Tier", min: 0, next: 1100 },
  { label: "Silver Tier", min: 1100, next: 1300 },
  { label: "Gold Tier", min: 1300, next: 1500 },
  { label: "Diamond Tier", min: 1500, next: 1700 },
  { label: "Grandmaster Tier", min: 1700, next: null },
] as const;

export function formatRaceTierRatingRange(min: number, next: number | null) {
  if (next === null) {
    return `${min.toLocaleString()}+`;
  }
  return `${min.toLocaleString()}–${(next - 1).toLocaleString()}`;
}

export function getRaceTierLabel(rating: number): string {
  const band = [...RACE_TIER_BANDS].reverse().find((entry) => rating >= entry.min);
  return band?.label ?? RACE_TIER_BANDS[0].label;
}

export function getRaceTierProgress(rating: number): {
  label: string;
  progressPercent: number;
  nextTierLabel: string | null;
  pointsToNext: number | null;
} {
  const band =
    RACE_TIER_BANDS.find((entry) => rating < (entry.next ?? Number.POSITIVE_INFINITY)) ??
    RACE_TIER_BANDS[RACE_TIER_BANDS.length - 1];

  if (band.next === null) {
    return {
      label: band.label,
      progressPercent: 100,
      nextTierLabel: null,
      pointsToNext: null,
    };
  }

  const span = band.next - band.min;
  const progressPercent = span > 0 ? Math.min(100, Math.max(0, Math.round(((rating - band.min) / span) * 100))) : 0;
  const nextBand = RACE_TIER_BANDS.find((entry) => entry.min === band.next);

  return {
    label: band.label,
    progressPercent,
    nextTierLabel: nextBand?.label ?? null,
    pointsToNext: Math.max(0, band.next - rating),
  };
}
