import type { DifficultyTier } from "@/types/domain";
import { Badge } from "@/components/ui/badge";

const difficultyStyles: Record<DifficultyTier, { label: string; variant: "default" | "neutral" | "purple" | "success" }> = {
  novice: { label: "Novice", variant: "success" },
  intermediate: { label: "Intermediate", variant: "default" },
  advanced: { label: "Advanced", variant: "purple" },
  expert: { label: "Expert", variant: "neutral" },
};

export function DifficultyBadge({ tier, score }: { tier: DifficultyTier; score?: number }) {
  const style = difficultyStyles[tier];

  return (
    <Badge variant={style.variant}>
      {style.label}
      {typeof score === "number" ? ` ${score}` : ""}
    </Badge>
  );
}
