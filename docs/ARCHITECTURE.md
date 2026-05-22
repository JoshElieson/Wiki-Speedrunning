# WikiRush Architecture Plan (Phase 1 Foundation)

## Product Positioning
WikiRush is a competitive knowledge-graph racing platform, not a timer-only Wikipedia clone. The first release focuses on a polished solo race loop while preserving extension points for multiplayer, replay, and ranked systems.

## Folder Structure

```txt
app/
  (marketing)/
  race/
  daily/
  leaderboard/
  profile/[username]/
  runs/[id]/
  challenges/
  api/
components/
  ui/
  layout/
features/
  race/
  wiki/
  leaderboard/
  profile/
  challenges/
  replay/
server/
  services/
  repositories/
lib/
  env.ts
  prisma.ts
  redis.ts
  query-client.ts
db/
  constants.ts
types/
utils/
prisma/
```

## Data Model (Prisma)
- `User`: account identity, profile stats, rating values.
- `Article`: normalized Wikipedia nodes with metadata.
- `Challenge`: start/target pair and deterministic seed.
- `DailyChallenge`: UTC date-indexed challenge.
- `Run`: durable completion records with anti-cheat metadata.
- `RunStep`: ordered traversal edges in each run.
- `LeaderboardEntry`: denormalized ranking rows for fast reads.
- `RatingRecord`: ELO/MMR history for transparency.
- `ReplayMetadata`: replay payload and visualization hooks.
- `RaceRoom` + `RaceParticipant`: multiplayer-ready room state.

## Core Backend Boundaries
- `features/wiki/services/wiki-service.ts`: Wikipedia API client + normalization + link extraction.
- `features/challenges/services/challenge-service.ts`: challenge selection and difficulty heuristics.
- `server/services/run-service.ts`: run validation, persistence orchestration, leaderboard updates.
- `server/repositories/*`: future SQL/Redis persistence adapters.

## Caching Strategy
- Redis key families:
  - `wiki:article:{normalizedTitle}` for article payloads
  - `wiki:links:{normalizedTitle}` for link adjacency
  - `challenge:daily:{yyyy-mm-dd}` for daily challenge snapshots
  - `leaderboard:{scope}` sorted sets for rank reads
  - `race:active:{roomId}` for live multiplayer state (phase 2)
- Graceful fallback to in-memory cache in local/dev.

## API Route Design (Phase 1)
- `GET /api/wiki/article?title=`: fetch normalized article + internal links
- `GET /api/challenges/next`: returns generated challenge pair
- `GET /api/daily`: returns daily challenge payload
- `GET /api/leaderboard`: global leaderboard preview
- `GET /api/profile/[username]`: user profile + recent runs
- `POST /api/runs`: submit completed run payload

## Race State Model (Zustand)
- `status`: idle | active | completed | abandoned
- `challenge`: current start/target metadata
- `currentArticle`: currently viewed article node
- `route`: ordered traversal history
- `startedAtMs` / `finishedAtMs`
- selectors for elapsed time, click count, completion checks

## Frontend Page Structure
- `/`: marketing homepage with live product sections
- `/race`: active race cockpit (article, timer, route, controls)
- `/daily`: daily challenge card + rank context
- `/leaderboard`: global rankings + filters placeholder
- `/profile/[username]`: stats, run history, progression cards
- `/runs/[id]`: result + replay/graph placeholder
- `/challenges`: challenge browser and queue starter

## Extension Points (Phase 2 Ready)
- Socket gateway boundary and room state contract already typed.
- Run/replay schemas include graph metadata stubs.
- Rating and race room tables can be activated without schema rewrite.
- Route visualization section reserves hooks for D3/visx graph overlays.
