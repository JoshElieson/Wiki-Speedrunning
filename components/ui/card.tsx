import { cn } from "@/utils/cn";
import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

const cardVariants = cva("rounded-[var(--radius-md)] border transition-colors", {
  variants: {
    variant: {
      default: "border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]",
      elevated: "border-[var(--border-strong)] bg-[var(--surface-elevated)] shadow-[var(--shadow-lifted)]",
      ghost: "border-[var(--border)] bg-[var(--surface-elevated)]",
    },
    interactive: {
      true: "hover:border-[var(--accent)] hover:bg-[var(--surface-elevated)]",
      false: "",
    },
  },
  defaultVariants: {
    variant: "default",
    interactive: false,
  },
});

type CardProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>;

export function Card({ className, variant, interactive, ...props }: CardProps) {
  return <div className={cn(cardVariants({ variant, interactive }), className)} {...props} />;
}
