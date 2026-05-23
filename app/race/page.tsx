import { Suspense } from "react";
import { RacePage } from "@/features/race/components/RacePage";
import { RacePageSkeleton } from "@/features/race/components/RacePageSkeleton";

export default function RaceRoutePage() {
  return (
    <main className="w-full">
      <Suspense fallback={<RacePageSkeleton />}>
        <RacePage />
      </Suspense>
    </main>
  );
}
