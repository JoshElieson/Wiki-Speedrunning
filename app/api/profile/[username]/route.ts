import type { ProfileSnapshot } from "@/types/domain";
import { NextResponse } from "next/server";

export async function GET(_: Request, context: { params: Promise<{ username: string }> }) {
  const { username } = await context.params;

  const profile: ProfileSnapshot = {
    username,
    displayName: username,
    rating: 1874,
    bestTimeMs: 52111,
    totalRuns: 124,
    wins: 34,
    recentRuns: [
      {
        id: "r-1001",
        challengeLabel: "Culture Shift",
        durationMs: 60992,
        clickCount: 13,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      },
      {
        id: "r-1000",
        challengeLabel: "Deep Dive",
        durationMs: 71112,
        clickCount: 15,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(),
      },
    ],
  };

  return NextResponse.json(profile);
}
