"use client";

import { useParams } from "next/navigation";
import { ProfileDetails } from "@/components/profile/profile-details";

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params.username;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <ProfileDetails username={username} />
    </main>
  );
}
