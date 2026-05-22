# Wikipedia Speedrunning Ranked Architecture

Wikipedia Speedrunning Ranked is a Wikipedia-link racing system built around graph traversal mechanics.
Players move from a start article to a target article using only internal Wikipedia links, and each run is scored by speed and path efficiency.

## Design Goals

- Keep the solo race loop fast and deterministic.
- Treat Wikipedia navigation as a first-class graph problem.
- Persist enough run detail to support replay and ghost systems.
- Separate service orchestration from data-access concerns.
- Prepare for realtime multiplayer without a schema rewrite.

## High-Level System Flow

1. Client requests a generated or daily challenge.
2. Race state initializes in a local Zustand store.
3. Client fetches article content and outgoing links through API routes.
4. Player clicks through internal links; route state records each step.
5. On completion, run payload is validated and persisted via Prisma.
6. Leaderboard data is served through cached backend reads.

## Repository Layout

```txt
app/                 # Next.js App Router pages + API routes
components/          # Shared UI building blocks
features/            # Domain modules (race, wiki, challenges)
server/
  services/          # Business orchestration
  repositories/      # Prisma data access
  cache/             # Cache abstraction layer
  validation/        # Zod schemas for API payloads
lib/                 # Prisma/Redis/query client wiring
db/                  # Shared constants (cache keys, defaults)
prisma/              # PostgreSQL schema
types/               # Shared frontend/backend domain types
```

## Domain Model

- `Article`: normalized Wikipedia article record and metadata.
- `Challenge`: start and target pair, difficulty metadata, challenge source.
- `DailyChallenge`: date-bound assignment for consistent daily competition.
- `Run`: completed run summary (time, clicks, score, status).
- `RunStep`: ordered traversal edges for route replay capability.
- `LeaderboardEntry`: denormalized ranking rows.
- `ReplayMetadata`: replay payload slot for future timeline playback.
- `RaceRoom` and `RaceParticipant`: multiplayer-ready room model.

## Service Boundaries

- `server/services/wiki/wikipedia-service.ts`
  - Wikipedia API access, title normalization, link extraction, cache hydration.
- `server/services/race/route-validation-service.ts`
  - Validates that submitted traversal follows legal outgoing links.
- `server/services/run-service.ts`
  - Validates run payloads, computes score, orchestrates persistence.
- `server/services/challenge-service.ts`
  - Generates challenge seeds and deterministic daily challenge sets.
- `server/services/leaderboard-service.ts`
  - Cached leaderboard retrieval.

## Cache Strategy

Wikipedia Speedrunning Ranked uses layered cache clients:

- Primary: Redis (`REDIS_URL`) or Upstash Redis (`UPSTASH_*`).
- Fallback: in-memory cache in local/dev environments.

Key families:

- `wiki:article:{normalizedTitle}`
- `wiki:links:{normalizedTitle}`
- `challenge:daily:{yyyy-mm-dd}`
- `leaderboard:{scope}:{limit}`
- `race:active:{roomId}` (reserved for multiplayer state)

## API Surface

- `GET /api/wiki/article?title=`: article summary + valid outgoing links.
- `POST /api/moves/validate`: server-side link-move validation.
- `GET /api/challenges/next`: generated challenge.
- `GET /api/daily`: daily challenge set.
- `GET /api/leaderboard`: ranked rows.
- `POST /api/runs`: submit completed run.
- `GET /api/runs/[id]`: run detail by id.

## Frontend State and Data Fetching

- Zustand (`features/race/stores/use-race-store.ts`) holds active race state:
  - `status`, challenge metadata, current article, route history, clock fields.
- TanStack Query handles API reads/writes:
  - challenge retrieval, article retrieval, run submission mutations, and cache invalidation.

## Current Implementation Status

### Completed

- Solo race loop, route tracking, and run submission pipeline.
- Challenge generation (daily + generated fallback paths).
- Wikipedia link fetch and normalized outgoing-link handling.
- Prisma-backed persistence for runs/challenges/articles.
- Leaderboard read path with caching.

### In Progress

- Run replay UI beyond basic route timeline scaffolding.
- Profile and run-detail backend parity across all views.

### Planned

- Ghost race playback against previous runs.
- Realtime multiplayer race rooms and synchronization.
- Enhanced analytics for route quality and decision points.
- Ranked season systems and richer challenge generation heuristics.
