import { cn } from "@/utils/cn";
import type { HTMLAttributes } from "react";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--radius-sm)] bg-gradient-to-r from-[#e3ded2] via-[#ece8df] to-[#e3ded2]",
        className
      )}
      {...props}
    />
  );
}
