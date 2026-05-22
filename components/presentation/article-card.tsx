import { Card } from "@/components/ui/card";

export function ArticleCard({
  title,
  description,
  meta,
}: {
  title: string;
  description: string;
  meta?: string;
}) {
  return (
    <Card className="p-4" interactive>
      <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
      {meta ? <p className="mt-3 text-xs text-[var(--muted)]">{meta}</p> : null}
    </Card>
  );
}
