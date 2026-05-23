# Wikipedia / multi-wiki manual test checklist

Run after changing `lib/wiki-modes/` or race flow code.

## Automated

```bash
npm run test:wiki-modes
```

## Wikipedia (must pass before merge)

- [ ] Open `/race` — Wikipedia card is enabled; variety modes show “Coming Soon” unless explicitly enabled.
- [ ] Start Wikipedia run — countdown, start/goal titles visible.
- [ ] Start page loads in reader; internal `/wiki/` links navigate and increment clicks.
- [ ] Reaching the goal opens completion modal and saves run (no submit error).
- [ ] Abandon from HUD returns to mode selection.
- [ ] Browser back on start page prompts abandon (Wikipedia-only guard).

## Enabled variety modes (when `enabled: true`)

- [ ] Mode card is clickable on `/race`.
- [ ] Article HTML loads from the correct wiki host (check network tab for `wikiId` on `/api/wiki/article`).
- [ ] Internal links stay on-wiki; blocked namespaces do not navigate.

## Disabled modes

- [ ] `/api/wiki/article?wikiId=pokemon&title=Pikachu` returns 4xx/5xx with clear error (not Wikipedia content).
