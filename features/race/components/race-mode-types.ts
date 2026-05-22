export interface RaceModeSummary {
  id: string;
  name: string;
  description: string;
  rating: number;
  bestTime: number | null;
  runs: number;
  enabled: boolean;
  tags: string[];
  ctaLabel: string;
}
