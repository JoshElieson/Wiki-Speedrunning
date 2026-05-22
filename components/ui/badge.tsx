import { cn } from "@/utils/cn";
import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

const badgeVariants = cva("inline-flex items-center rounded-[var(--radius-sm)] border px-2.5 py-1 text-xs font-medium", {
  variants: {
    variant: {
      default: "border-[#b7c7da] bg-[var(--accent-soft)] text-[var(--accent-strong)]",
      neutral: "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--muted)]",
      purple: "border-[#8f7d66]/40 bg-[#f3ede3] text-[#5b4a38]",
      success: "border-[#67806e]/40 bg-[#ecf3ee] text-[#355340]",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}
