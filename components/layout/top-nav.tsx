"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/layout/brand-logo";
import { AuthNav } from "@/components/layout/auth-nav";
import { cn } from "@/utils/cn";

const links = [
  { href: "/race", label: "Race" },
  { href: "/daily", label: "Daily" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export function TopNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hideForActiveRace =
    pathname === "/race" && Boolean(searchParams.get("start")) && Boolean(searchParams.get("target"));

  if (hideForActiveRace) {
    return null;
  }

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="rounded-[var(--radius-sm)] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          <BrandLogo />
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
          <AuthNav profileActive={pathname.startsWith("/profile")} />
        </nav>
      </div>
    </header>
  );
}
