"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn";

export function StatCard({
  label,
  value,
  hint,
  labelClassName,
  logo,
  delay = 0,
}: {
  label: string;
  value: string;
  hint?: string;
  labelClassName?: string;
  logo?: ReactNode;
  delay?: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.28 }}>
      <Card className="p-5">
        <div className={cn("flex gap-3", logo ? "items-start" : "")}>
          {logo}
          <div className="min-w-0 flex-1">
            <p className={cn("text-xs uppercase tracking-[0.2em] text-[var(--muted)]", labelClassName)}>{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">{value}</p>
            {hint ? <p className="mt-1 text-sm text-[var(--muted)]">{hint}</p> : null}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
