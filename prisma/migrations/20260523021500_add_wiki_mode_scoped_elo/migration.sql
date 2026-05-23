-- Normalize legacy leaderboard scope keys to wiki-mode ids.
UPDATE "LeaderboardEntry"
SET "scope" = 'wikipedia'
WHERE "scope" IN ('global', 'default', 'solo', 'wikipedia-elo');

-- Ensure rating history context uses wiki-mode ids where applicable.
UPDATE "RatingRecord"
SET "context" = 'wikipedia'
WHERE "context" IN ('global', 'default', 'solo', 'wikipedia-elo');
