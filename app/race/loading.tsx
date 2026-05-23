import { RaceLoadingSpinner } from "@/features/race/components/RaceLoadingSpinner";

export default function RaceLoading() {
  return (
    <main className="flex min-h-[50vh] w-full items-center justify-center">
      <RaceLoadingSpinner />
    </main>
  );
}
