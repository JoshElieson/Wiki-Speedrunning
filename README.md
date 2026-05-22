# Wikipedia Speedrunning Ranked

Wikipedia Speedrunning Ranked is a competitive Wikipedia speedrunning platform where players race from one article to another using only internal Wikipedia links.

## Product Overview

Each run follows a simple but strategically deep loop:

1. Start on one Wikipedia article.
2. Reach a target article using only internal links.
3. Race the clock and minimize unnecessary clicks.
4. Compare route quality, click count, and completion time against other players.

## Why This Is Technically Interesting

Wikipedia Speedrunning Ranked is modeled as a graph problem:

- Wikipedia articles are graph nodes.
- Internal links are graph edges.
- A player run is a graph traversal sequence.
- Replay and ghost race systems build on deterministic traversal timelines.
- Daily challenge and leaderboard systems generate repeatable, rankable graph tasks.
- Caching article payloads and adjacency lists is critical to keep gameplay responsive.

The current architecture is designed to support solo play now and realtime multiplayer later.

## Project Status

### Completed

- Solo race gameplay loop with challenge loading, article traversal, timer, click tracking, and run completion.
- Internal-link validation and route checks before run persistence.
- Run submission pipeline with Prisma-backed storage (`Run`, `RunStep`, and linked article records).
- Daily challenge generation and retrieval (`time` and `clicks` modes).
- Leaderboard API and leaderboard UI page with cached reads.
- Redis/Upstash/in-memory cache fallback for article, links, and challenge payloads.

### In Progress

- Replay UX: route timeline UI scaffolding exists, but full graph replay visualization is not complete.
- Profile and run-detail experiences: pages exist, with part of the data currently mocked while backend surfaces mature.
- Multiplayer foundations: schema and package groundwork are present, but active socket room flow is not yet implemented.

### Planned

- Ghost races.
- Realtime multiplayer races.
- Advanced replay visualization.
- Ranked ladder seasons and matchmaking systems.
- Route analytics and optimization insights.
- Expanded challenge generation with richer difficulty modeling.

## Core Features

- Solo Wikipedia speedruns with strict internal-link navigation.
- Dynamic challenge generation (`start -> target`) with difficulty metadata.
- Daily challenge set generation for consistent competition.
- Run validation and persistence with step-by-step traversal history.
- Leaderboard views for ranking and comparison.
- Route trail capture designed for replay/ghost extensions.

## Architecture Overview

Wikipedia Speedrunning Ranked uses a layered Next.js architecture:

- `app/`: UI routes and API route handlers.
- `features/`: race flow, wiki integration, and challenge-domain logic.
- `server/services/`: orchestration for run submission, leaderboard reads, challenge behavior.
- `server/repositories/`: Prisma data access boundaries.
- `lib/`: infrastructure clients (`prisma`, cache adapters, query client).
- `prisma/`: PostgreSQL schema for users, runs, challenges, leaderboard, replay metadata, and multiplayer-ready room entities.

For a deeper technical breakdown, see `docs/ARCHITECTURE.md`.

## Tech Stack

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- Redis (or Upstash Redis)
- Zustand (client race state)
- TanStack Query (server-state fetching/caching)
- Framer Motion (motion and transitions)
- Socket/WebSocket-ready foundation (schema and dependencies prepared)

## Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Copy `.env.example` to `.env` and set values:

- `DATABASE_URL` (PostgreSQL connection string)
- `REDIS_URL` (optional local Redis connection)
- `UPSTASH_REDIS_REST_URL` (optional Upstash endpoint)
- `UPSTASH_REDIS_REST_TOKEN` (optional Upstash token)
- `NEXT_PUBLIC_APP_URL` (default: `http://localhost:3000`)

If Redis is not configured, Wikipedia Speedrunning Ranked falls back to in-memory cache for local development.

**Solo races without a database:** If `DATABASE_URL` is missing or PostgreSQL is unreachable, solo races still start using built-in fallback challenges. Run submission is stored in memory for that session. For leaderboards, profiles, and persisted challenge pools, set up PostgreSQL as below.

**Local PostgreSQL (recommended):**

```bash
npm run db:up
copy .env.example .env
```

On macOS/Linux, use `cp .env.example .env` instead of `copy`.

### 3) Prisma setup

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 4) Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev`: start local development server
- `npm run build`: production build
- `npm run start`: run production server
- `npm run lint`: run ESLint
- `npm run format`: check Prettier formatting
- `npm run format:write`: fix Prettier formatting
- `npm run prisma:generate`: generate Prisma client
- `npm run prisma:migrate`: run development migrations
- `npm run prisma:studio`: open Prisma Studio

## Planned Features Roadmap

- Ghost races and personal-best overlays.
- Daily challenge progression and streak systems.
- Realtime multiplayer races and spectators.
- Rich replay visualization with graph path playback.
- Ranked ladder progression and challenge tiers.
- Route analytics (detours, path efficiency, split timing).

## Repo Structure

```txt
app/          # Pages and API routes
components/   # Shared UI and presentation components
features/     # Domain-focused frontend logic (race/wiki/challenges)
server/       # Services, repositories, validation, and cache wiring
lib/          # Infra clients and adapters
prisma/       # Database schema and migrations
docs/         # Architecture and technical docs
```
