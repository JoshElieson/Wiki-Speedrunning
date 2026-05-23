# Wiki mode registry

All wiki speedrun modes plug into one shared race lifecycle via `WikiModeConfig`. Do **not** fork `WikipediaRaceRunner` or duplicate run APIs per wiki.

## Adding a new wiki mode

1. **Config** — Create `lib/wiki-modes/modes/<id>.ts` using `createBaseMediaWikiMode()` (MediaWiki/Fandom) or copy an existing mode and adjust:
   - `id`, `displayName`, `baseUrl`, `articlePathPrefixes`, `internalHostPattern`
   - `blockedTitlePrefixes` (and `blockedPathPrefixes` if needed)
   - `enabled: false` until the server adapter works end-to-end

2. **Register config** — Import the mode in `lib/wiki-modes/registry.ts` and add it to `wikiModesById`.

3. **Server adapter** — In `lib/wiki-modes/server/registry.ts`:
   - MediaWiki/Fandom wikis: use `createMediaWikiAdapter("your-id")` if `mediawiki-service.ts` supports the mode.
   - Custom APIs: add `server/services/wiki/<your-wiki>-service.ts` and register it in `lib/wiki-modes/server/registry.ts`.
   - Or call `registerWikiModeServerAdapter()` from module init when wiring adapters dynamically.

4. **Enable** — Set `enabled: true` on the config only when article fetch, link validation, random challenges, and run save work.

5. **UI** — `RacePage` reads `buildRaceModeSummaries()` from the registry; no hardcoded mode cards.

## Key modules

| Module | Role |
|--------|------|
| `types.ts` | `WikiModeConfig`, `WikiModeId`, `WikiId` |
| `registry.ts` | `getWikiMode()`, `getWikiModeConfig()`, `ALL_WIKI_MODES` |
| `server/registry.ts` | Server adapters (article fetch, links, random pages) |
| `features/race/components/WikipediaRaceRunner.tsx` | Generic runner (`WikiRaceRunner` export); takes `modeId` |
| `features/wiki/services/wiki-client.ts` | Client article fetch (`wikiId` query param) |
| `app/api/wiki/article/route.ts` | Article API; rejects disabled modes |

## Shared run lifecycle (do not duplicate)

1. Select mode → `WikiRaceRunner` with `modeId`
2. Random/custom challenge → `fetchRandomChallenge(modeId)`
3. Load article → `fetchArticle(title, modeId)` → `/api/wiki/article?wikiId=…`
4. Internal links → `mode.extractTitleFromHref(href)`
5. Completion → `mode.matchesRaceTarget(visited, target, canonical)`
6. Submit run → `/api/runs` (Wikipedia ELO today; variety ELO when wired)

## Legacy aliases

- `WikiId` / `wikiId` query param — includes `starwars` → `star-wars`
- `@/features/wiki/config/wiki-modes` — re-exports `@/lib/wiki-modes` (deprecated)
