"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Flag, MousePointerClick, Timer, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const howToPlaySteps = [
  {
    title: "Start on a random article",
    description: "Your run begins on a Wikipedia page picked for the challenge.",
    icon: Flag,
  },
  {
    title: "Click links to navigate",
    description: "Only Wikipedia links allowed. No search bar, no shortcuts.",
    icon: MousePointerClick,
  },
  {
    title: "Reach the target quickly",
    description: "Fewer clicks and faster time move you up the rankings.",
    icon: Timer,
  },
];

export function LandingPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-10 md:gap-16 md:py-14">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto flex max-w-4xl flex-col items-center text-center"
      >
        <div className="w-full space-y-6">
          <Badge variant="neutral">Wikipedia Link Racing</Badge>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-[var(--foreground)] md:text-6xl">
            Race through Wikipedia.
          </h1>
          <p className="whitespace-nowrap text-lg text-[var(--muted)]">
            Start on one article. Reach the target using only Wikipedia links. Every click counts.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/race">
              <Button size="lg">
                Start a race <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href="/daily">
              <Button variant="outline" size="lg">
                Try daily challenge
              </Button>
            </Link>
          </div>

          <Card className="space-y-4 p-5 text-left" variant="elevated">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">How to play</h2>
            <ol className="space-y-3">
              {howToPlaySteps.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-soft)] text-sm font-semibold text-[var(--foreground)]">
                    {index + 1}
                  </div>
                  <div>
                    <p className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                      <step.icon size={14} className="text-[var(--accent)]" />
                      {step.title}
                    </p>
                    <p className="text-sm text-[var(--muted)]">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.35 }}
        className="space-y-4"
      >
        <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">Why people compete</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <ProofCard
            title="Daily challenge"
            description="Compete on the same start and target each day."
            line="One puzzle. Everyone races it."
          />
          <ProofCard
            title="Leaderboard"
            description="Fast routes and clean decisions climb the rank."
            line="#1 graphsprinter · 2142"
          />
          <ProofCard
            title="Route breakdown"
            description="See the exact path you took after every run."
            line="Internet -> ... -> Graph theory"
          />
        </div>
      </motion.section>
    </main>
  );
}

function ProofCard({ title, description, line }: { title: string; description: string; line: string }) {
  return (
    <Card className="p-5" interactive>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
        <Trophy size={16} className="text-[var(--accent)]" />
      </div>
      <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
      <p className="mt-4 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--muted)]">
        {line}
      </p>
    </Card>
  );
}
