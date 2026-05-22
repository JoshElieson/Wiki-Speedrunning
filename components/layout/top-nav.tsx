"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/cn";

const links = [
  { href: "/race", label: "Race" },
  { href: "/daily", label: "Daily" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/challenges", label: "Challenges" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
          Wiki<span className="text-[var(--accent)]">Rush</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm text-[var(--muted)]">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-[var(--radius-sm)] px-3 py-1.5 transition-colors hover:text-[var(--foreground)]",
                pathname.startsWith(link.href)
                  ? "border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--accent)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-elevated)]"
              )}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/profile/demo"
            className={cn(
              "rounded-[var(--radius-sm)] border border-[var(--border-strong)] px-3 py-1.5 text-[var(--foreground)] transition-colors hover:border-[var(--accent)]",
              pathname.startsWith("/profile") ? "bg-[var(--surface-elevated)] text-[var(--accent)]" : ""
            )}
          >
            Profile
          </Link>
        </nav>
      </div>
    </header>
  );
}
