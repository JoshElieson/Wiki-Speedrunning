"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  hint,
  delay = 0,
}: {
  label: string;
  value: string;
  hint?: string;
  delay?: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.28 }}>
      <Card className="p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{label}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">{value}</p>
        {hint ? <p className="mt-1 text-sm text-[var(--muted)]">{hint}</p> : null}
      </Card>
    </motion.div>
  );
}
