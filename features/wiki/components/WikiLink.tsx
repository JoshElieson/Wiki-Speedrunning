"use client";

import { motion } from "framer-motion";
import { cn } from "@/utils/cn";

interface WikiLinkProps {
  title: string;
  onClick: (title: string) => void;
  disabled?: boolean;
  highlighted?: boolean;
}

export function WikiLink({ title, onClick, disabled = false, highlighted = false }: WikiLinkProps) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      type="button"
      onClick={() => onClick(title)}
      disabled={disabled}
      className={cn(
        "group cursor-pointer rounded-lg border px-3 py-2 text-left text-sm transition-colors",
        "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--accent)] hover:bg-[var(--surface-elevated)]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        highlighted && "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
      )}
    >
      <span className="line-clamp-2">{title}</span>
    </motion.button>
  );
}
