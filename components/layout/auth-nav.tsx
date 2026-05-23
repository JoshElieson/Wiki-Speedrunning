"use client";

import Image from "next/image";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { GoogleIcon } from "@/components/icons/google-icon";
import { cn } from "@/utils/cn";

export function AuthNav({ profileActive }: { profileActive: boolean }) {
  const { data: session, status } = useSession();
  const user = session?.user;

  if (status === "loading") {
    return (
      <span
        className="inline-block h-8 w-8 rounded-full bg-[var(--surface-elevated)]"
        aria-hidden
      />
    );
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/profile" })}
        className={cn(
          "inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--foreground)] shadow-[var(--shadow-soft)] transition-[color,background-color,border-color,box-shadow] duration-200 ease-out hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)] hover:shadow-[var(--shadow-lifted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] active:shadow-[var(--shadow-soft)]",
          profileActive
            ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)] hover:bg-[var(--accent-soft)]"
            : "",
        )}
      >
        <GoogleIcon />
        Sign in with Google
      </button>
    );
  }

  const displayName = user.name ?? user.email ?? "Profile";
  const avatarSrc = user.image ?? undefined;

  return (
    <Link
      href="/profile"
      title={displayName}
      aria-label={`${displayName} — open profile`}
      className={cn(
        "relative inline-flex rounded-full transition-opacity hover:opacity-90",
        profileActive ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--background)]" : "",
      )}
    >
      {avatarSrc ? (
        <Image
          src={avatarSrc}
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 rounded-full object-cover"
          unoptimized
        />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-xs font-medium text-[var(--foreground)]">
          {displayName.charAt(0).toUpperCase()}
        </span>
      )}
      <span
        className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--background)] bg-green-500"
        aria-hidden
      />
    </Link>
  );
}
