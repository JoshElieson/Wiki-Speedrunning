"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { AuthNav } from "@/components/layout/auth-nav";
import { cn } from "@/utils/cn";

const links = [
  { href: "/race", label: "Race" },
  { href: "/daily", label: "Daily" },
  { href: "/leaderboard", label: "Leaderboard" },
];

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isActive = pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      onClick={(event) => {
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0 ||
          isActive
        ) {
          return;
        }

        event.preventDefault();
        startTransition(() => {
          router.push(href);
        });
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 transition-colors hover:text-[var(--foreground)]",
        isActive
          ? "border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--accent)]"
          : "text-[var(--muted)] hover:bg-[var(--surface-elevated)]",
        isPending && "opacity-80",
      )}
    >
      {isPending ? (
        <span
          className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      ) : null}
      {label}
    </Link>
  );
}

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
            <NavLink key={link.href} href={link.href} label={link.label} />
          ))}
          <AuthNav profileActive={pathname.startsWith("/profile")} />
        </nav>
      </div>
    </header>
  );
}
