import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DUMMY_AVATAR_PREFIX = "https://api.dicebear.com/7.x/avataaars";

async function main() {
  const dummyUsers = await prisma.user.findMany({
    where: {
      avatarUrl: {
        startsWith: DUMMY_AVATAR_PREFIX,
      },
    },
    select: { id: true, username: true },
  });

  if (dummyUsers.length === 0) {
    console.log("No dummy users found.");
    return;
  }

  const dummyUserIds = dummyUsers.map((user) => user.id);
  console.log(`Removing ${dummyUsers.length} dummy users...`);

  const dummyRunIds = (
    await prisma.run.findMany({
      where: { userId: { in: dummyUserIds } },
      select: { id: true },
    })
  ).map((run) => run.id);

  if (dummyRunIds.length > 0) {
    await prisma.runStep.deleteMany({ where: { runId: { in: dummyRunIds } } });
    await prisma.replayMetadata.deleteMany({ where: { runId: { in: dummyRunIds } } });
    await prisma.run.deleteMany({ where: { id: { in: dummyRunIds } } });
  }

  await prisma.leaderboardEntry.deleteMany({ where: { userId: { in: dummyUserIds } } });
  await prisma.ratingRecord.deleteMany({ where: { userId: { in: dummyUserIds } } });
  await prisma.raceParticipant.deleteMany({ where: { userId: { in: dummyUserIds } } });
  await prisma.user.deleteMany({ where: { id: { in: dummyUserIds } } });

  const remainingUsers = await prisma.user.count();
  const remainingLeaderboard = await prisma.leaderboardEntry.count();
  console.log(`Done. Remaining users: ${remainingUsers}, leaderboard entries: ${remainingLeaderboard}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
