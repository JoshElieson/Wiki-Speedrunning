import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function ArticleCard({
  title,
  description,
  meta,
}: {
  title: ReactNode;
  description: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <Card className="p-4" interactive>
      <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
      {meta ? <div className="mt-3 text-xs text-[var(--muted)]">{meta}</div> : null}
    </Card>
  );
}
