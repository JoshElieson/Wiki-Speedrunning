import { getRunsForUserHistory } from "@/server/services/run-service";
import { buildProfileSnapshot, loadProfileStatsForUser } from "@/server/services/profile-stats-service";
import { ensureDefaultRatings } from "@/server/services/rating-service";
import { getUserByUsername } from "@/server/repositories/user-repository";
import type { ProfileSnapshot } from "@/types/domain";

export async function fetchProfileSnapshotByUsername(username: string): Promise<ProfileSnapshot | null> {
  const user = await getUserByUsername(username);
  if (!user) {
    return null;
  }

  await ensureDefaultRatings(user.id);

  const [runs, profileStats] = await Promise.all([
    getRunsForUserHistory(user.id, 100),
    loadProfileStatsForUser(user.id),
  ]);

  return buildProfileSnapshot({
    username: user.username,
    displayName: user.displayName ?? user.username,
    avatarUrl: user.avatarUrl ?? null,
    ratingEntries: profileStats.ratingEntries,
    runAggregates: profileStats.runAggregates,
    totalRuns: profileStats.totalRuns,
    recentRuns: runs,
  });
}
