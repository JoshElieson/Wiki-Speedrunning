"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Flag, MousePointerClick, Timer, Trophy } from "lucide-react";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RotatingHeroWord } from "@/components/landing/rotating-hero-word";
import { useViewportFitScale } from "@/components/landing/use-viewport-fit-scale";
import { HERO_ROTATING_WORDS } from "@/lib/profile-elo-categories";

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
  const { containerRef, contentRef } = useViewportFitScale();

  useEffect(() => {
    const { documentElement: html, body } = document;
    const scrollHost = containerRef.current?.parentElement;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHostOverflow = scrollHost?.style.overflow;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (scrollHost) {
      scrollHost.style.overflow = "hidden";
    }

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      if (scrollHost) {
        scrollHost.style.overflow = prevHostOverflow ?? "";
      }
    };
  }, [containerRef]);

  return (
    <main
      ref={containerRef}
      className="mx-auto flex h-full min-h-0 w-full items-center justify-center overflow-hidden px-4 py-3 sm:px-6 sm:py-4"
    >
      <div
        ref={contentRef}
        className="flex w-full max-w-6xl origin-center flex-col gap-[clamp(0.75rem,2vh,2rem)] will-change-transform"
      >
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto flex w-full max-w-4xl flex-col items-center text-center"
        >
          <div className="flex w-full flex-col gap-[clamp(0.5rem,1.6vh,1.25rem)]">
            <Badge variant="neutral">Wikipedia Link Racing</Badge>
            <h1 className="text-balance text-[clamp(1.75rem,4.8vw,3.75rem)] font-semibold leading-tight tracking-tight text-[var(--foreground)]">
              <span className="inline-flex flex-wrap items-baseline justify-center gap-x-[0.28em]">
                Race through <RotatingHeroWord words={HERO_ROTATING_WORDS} />
              </span>
            </h1>
            <p className="text-balance text-[clamp(0.9rem,1.8vh,1.125rem)] leading-snug text-[var(--muted)]">
              Start from one page. Reach the target using only in-world links. Every click counts.
            </p>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
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

            <Card className="space-y-2 p-3 text-left sm:space-y-3 sm:p-4" variant="elevated">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)] sm:text-sm">
                How to play
              </h2>
              <ol className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
                {howToPlaySteps.map((step, index) => (
                  <li key={step.title} className="flex gap-2 sm:flex-col sm:gap-1.5">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-soft)] text-xs font-semibold text-[var(--foreground)] sm:h-7 sm:w-7 sm:text-sm">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--foreground)] sm:text-sm">
                        <step.icon size={13} className="shrink-0 text-[var(--accent)]" />
                        {step.title}
                      </p>
                      <p className="text-xs leading-snug text-[var(--muted)] sm:text-sm">{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="space-y-2 sm:space-y-3"
        >
          <h2 className="text-base font-semibold tracking-tight text-[var(--foreground)] sm:text-lg">
            Why people compete
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
            <ProofCard
              href="/daily"
              title="Daily challenge"
              description="Compete on the same start and target each day."
              line="One puzzle. Everyone races it."
            />
            <ProofCard
              href="/leaderboard"
              title="Leaderboard"
              description="Fast routes and clean decisions climb the rank."
              line="#1 graphsprinter · 2142"
            />
            <ProofCard
              href="/profile"
              title="Route breakdown"
              description="See the exact path you took after every run."
              line="Internet -> ... -> Graph theory"
            />
          </div>
        </motion.section>
      </div>
    </main>
  );
}

function ProofCard({
  href,
  title,
  description,
  line,
}: {
  href: string;
  title: string;
  description: string;
  line: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-[var(--radius-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
    >
      <Card className="p-3 sm:p-4" interactive>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--foreground)] sm:text-base">{title}</h3>
          <Trophy size={15} className="shrink-0 text-[var(--accent)]" />
        </div>
        <p className="mt-1 text-xs leading-snug text-[var(--muted)] sm:mt-1.5 sm:text-sm">{description}</p>
        <p className="mt-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1.5 text-xs text-[var(--muted)] sm:mt-3 sm:px-3 sm:py-2 sm:text-sm">
          {line}
        </p>
      </Card>
    </Link>
  );
}
