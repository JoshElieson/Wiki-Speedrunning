# WikiSpeedrunning

A ranked Wikipedia speedrunning platform where players race from a starting article to a target article using only internal Wikipedia links.

The app turns Wikipedia into a graph traversal game: each article is a node, each link is an edge, and each completed run is scored by time, clicks, and route efficiency.

## Live Site

[wikispeedrunning.com](https://wikispeedrunning.com)

## Why I Built It

I wanted to create a project that combines a fun user-facing game with real full-stack engineering challenges: route tracking, leaderboard design, run validation, caching, user profiles, and scalable game-mode architecture.

## Features

- Ranked Wikipedia speedruns with time and click tracking
- User profiles with ELO-style ranking
- Global leaderboards
- Daily challenges
- Run history and completion stats
- Wikipedia page fetching and link parsing
- Cached page data for faster gameplay
- Architecture designed to support additional wiki modes such as Minecraft, Pokémon, Star Wars, Marvel, and League of Legends

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, Zustand
- **Backend:** Node.js, Express
- **Database:** PostgreSQL, Prisma
- **Caching:** Redis / Upstash
- **Data Source:** Wikipedia API
- **Deployment:** Vercel / cloud-hosted backend

## Engineering Highlights

- Modeled Wikipedia navigation as a graph traversal problem
- Built a ranked gameplay loop with persistent user stats and leaderboards
- Designed a scalable schema for supporting multiple wiki game modes
- Implemented cached page retrieval to reduce repeated API calls
- Structured the app around reusable game logic, route tracking, and run validation

## What I Learned

This project strengthened my ability to build full-stack applications that combine product design, database modeling, external APIs, caching, and real-time-feeling user interaction. It also pushed me to think about how to turn a simple idea into a polished, replayable web app.

## Future Improvements

- Multiplayer races
- Public replay sharing
- Route visualization
- More wiki modes
- Improved anti-cheat and run validation
- Seasonal rankings and achievements
