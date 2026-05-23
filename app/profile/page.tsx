"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { GoogleIcon } from "@/components/icons/google-icon";
import { ProfileDetails } from "@/components/profile/profile-details";
import { Button } from "@/components/ui/button";
import { LoadingPanel } from "@/components/presentation/state-panel";

function describeAuthError(error: string | null): string | null {
  if (!error) {
    return null;
  }

  const decoded = decodeURIComponent(error.replace(/\+/g, " "));

  if (
    decoded.includes("localhost:5432") ||
    decoded.includes("Can't reach database server") ||
    decoded.includes("P1001")
  ) {
    return "PostgreSQL is not running. Start Docker Desktop, run `npm run db:up`, then `npm run prisma:migrate`, and sign in again.";
  }

  if (error === "AccessDenied") {
    return "Sign-in was denied. If Google succeeded, the database may be down — start Postgres with `npm run db:up` and try again.";
  }

  if (error === "OAuthCallback") {
    return "Google sign-in failed during the callback. Check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and NEXTAUTH_URL in `.env`.";
  }

  return `Sign-in did not complete (${error}). Check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and NEXTAUTH_URL in \`.env\`.`;
}

function ProfilePageContent() {
  const { data: session, status, update } = useSession();
  const searchParams = useSearchParams();
  const authError = searchParams.get("error");
  const authErrorMessage = describeAuthError(authError);
  const displayName = session?.user?.name ?? session?.user?.email ?? "Signed-in user";

  useEffect(() => {
    // After OAuth redirect the session cookie is set; refresh client state.
    if (searchParams.has("callbackUrl") || searchParams.has("error")) {
      void update();
    }
  }, [searchParams, update]);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      {authErrorMessage ? (
        <p className="mb-4 rounded-[var(--radius-sm)] border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {authErrorMessage}
        </p>
      ) : null}

      {status === "loading" ? <LoadingPanel title="Loading profile" /> : null}

      {status !== "loading" && !session?.user ? (
        <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-6">
          <h1 className="text-2xl font-semibold text-[var(--foreground)] md:text-3xl">Profile</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Sign in with Google to link your runs, ratings, and profile stats to your account.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 gap-2 shadow-[var(--shadow-soft)] transition-[color,background-color,border-color,box-shadow] duration-200 ease-out hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)] hover:shadow-[var(--shadow-lifted)] active:shadow-[var(--shadow-soft)]"
            onClick={() => signIn("google", { callbackUrl: "/profile" })}
          >
            <GoogleIcon />
            Sign in with Google
          </Button>
        </section>
      ) : null}

      {session?.user ? (
        <>
          <div className="mb-4 flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <p className="text-sm text-[var(--muted)]">
              Signed in as <span className="font-medium text-[var(--foreground)]">{displayName}</span>
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/profile" })}>
              Sign out
            </Button>
          </div>
          {session.user.username ? (
            <ProfileDetails username={session.user.username} key={session.user.username} />
          ) : (
            <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-6">
              <h1 className="text-2xl font-semibold text-[var(--foreground)] md:text-3xl">Profile</h1>
              <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
                You are signed in, but we could not load your profile username yet. Refresh once, and if it persists I can
                wire a dedicated `/api/profile/me` resolver.
              </p>
            </section>
          )}
        </>
      ) : null}
    </main>
  );
}

export default function CurrentProfilePage() {
  return (
    <Suspense fallback={<LoadingPanel title="Loading profile" />}>
      <ProfilePageContent />
    </Suspense>
  );
}
