"use client";

import { Pencil } from "lucide-react";
import { useSession } from "next-auth/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";

type EditableDisplayNameProps = {
  username: string;
  displayName: string;
  className?: string;
};

export function EditableDisplayName({ username, displayName, className }: EditableDisplayNameProps) {
  const { update: updateSession } = useSession();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const isSavingRef = useRef(false);
  const visibleName = displayName.trim() || username;
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(visibleName);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraft(displayName.trim() || username);
  }, [displayName, username]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const saveMutation = useMutation({
    mutationFn: async (nextName: string) => {
      const response = await fetch("/api/profile/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: nextName }),
      });

      const payload = (await response.json()) as {
        displayName?: string;
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Could not save profile");
      }

      return payload;
    },
    onSuccess: async (payload) => {
      setErrorMessage(null);
      await updateSession();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile", username] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
      ]);
      if (payload.displayName) {
        setDraft(payload.displayName);
      }
      setIsEditing(false);
    },
    onError: (error) => {
      setDraft(visibleName);
      setIsEditing(false);
      setErrorMessage(error instanceof Error ? error.message : "Could not save profile");
    },
  });

  const commitEdit = () => {
    if (isSavingRef.current || saveMutation.isPending) {
      return;
    }

    const trimmed = draft.trim();
    if (trimmed.length === 0 || trimmed === visibleName) {
      setDraft(visibleName);
      setIsEditing(false);
      return;
    }

    isSavingRef.current = true;
    saveMutation.mutate(trimmed, {
      onSettled: () => {
        isSavingRef.current = false;
      },
    });
  };

  const cancelEdit = () => {
    setDraft(visibleName);
    setIsEditing(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={48}
            aria-label="Display name"
            disabled={saveMutation.isPending}
            className={cn(
              "min-w-0 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-0.5 text-3xl font-semibold tracking-tight text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)] md:text-4xl",
              className,
            )}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitEdit();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                cancelEdit();
              }
            }}
            onBlur={commitEdit}
          />
        ) : (
          <>
            <h1 className={cn("text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl", className)}>
              {visibleName}
            </h1>
            <button
              type="button"
              aria-label="Edit display name"
              onClick={() => {
                setErrorMessage(null);
                setDraft(visibleName);
                setIsEditing(true);
              }}
              className="rounded-[var(--radius-sm)] p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
      {errorMessage ? <p className="mt-1 text-sm text-red-300">{errorMessage}</p> : null}
    </div>
  );
}

export function isOwnProfile(username: string, sessionUsername?: string | null) {
  return Boolean(sessionUsername && sessionUsername === username);
}
