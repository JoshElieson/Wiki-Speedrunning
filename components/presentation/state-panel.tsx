import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingPanel({ title = "Loading" }: { title?: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-5/6" />
      </div>
    </Card>
  );
}

export function ErrorPanel({ message }: { message: string }) {
  return (
    <Card className="border-[#b77c70]/50 bg-[#f8ece9] p-5">
      <p className="text-sm font-medium text-[#7a3125]">Something went wrong</p>
      <p className="mt-1 text-sm text-[#8f4538]">{message}</p>
    </Card>
  );
}

export function EmptyPanel({ title, message }: { title: string; message: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{message}</p>
    </Card>
  );
}
