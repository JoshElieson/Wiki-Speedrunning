import { RacePage } from "@/features/race/components/RacePage";
import { getSession } from "@/lib/session";
import { fetchProfileSnapshotByUsername } from "@/server/services/profile-service";

export default async function RaceRoutePage() {
  const session = await getSession();
  const username = session?.user?.username;
  const initialProfile = username ? await fetchProfileSnapshotByUsername(username) : null;

  return (
    <main className="w-full">
      <RacePage initialProfile={initialProfile} />
    </main>
  );
}
