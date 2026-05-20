# Prompt 97 - Housing Workshop Homestead Progression QA

Prompt 97 evolves housing into a workshop and homestead progression loop: storage, preparation, modest crafting convenience, identity, and long-term resource sinks.

## Scope

- Housing tiers now run from Camp through Workshop Plot, Cottage, and Homestead.
- Functional housing objects cover storage, reagents, tools, weapons, armor, trophies, workbench stations, gardens, rest, recall/home anchor, and lighting.
- Housing progression consumes boards, stone, metal, cloth, rare materials, work-order completion, and gold.
- Station bonuses stay modest and only apply when crafting at home with a matching placed station.
- Vendor stalls and guest permissions remain reserved for later systems, matching the prompt's "later" scope.

## Acceptance Checklist

- [x] Tier 0 Camp supports rest/storage/fire/light basics.
- [x] Tier 1 Workshop Plot supports resource crate, workbench, reagent shelf, weapon rack, training dummy, and trophy hook.
- [x] Tier 2 Cottage supports secure storage, specialized station, garden patch, home marker, and upgraded lighting.
- [x] Tier 3 Homestead is now reachable and supports advanced station, herb planters, trophy room identity, and upgraded lighting.
- [x] Functional objects include resource crate, reagent shelf, tool rack, weapon rack, armor stand, trophy hook, small workbench, garden/herb patch, bed/rest point, and lighting.
- [x] Existing placement rules preserve plot boundaries, collision checks, road-blocking prevention, and tier/placement limits.
- [x] Storage caps remain finite through per-object slot and weight limits.
- [x] Crafting convenience is modest: home station bonus is capped at 8%.
- [x] Housing consumes normal and rare economy outputs, including boards, stone, metal, cloth, gems/trophies, and work-order completion for upper tiers.
- [x] After dungeon/economy sessions, the player has reasons to return home: rest, staging storage/tools, crafting, garden harvests, recall anchor, and trophies.

## Implementation Summary

- Renamed tier 3 from `Homestead Later` to active `Homestead` and removed the upgrade block that prevented reaching it.
- Added new build pieces:
  - `tool_rack_home`
  - `advanced_workshop_home`
  - `lantern_chandelier_home`
  - `homestead_herb_planter`
  - `trophy_wall_home`
- Added item/build costs for the new pieces using boards, iron, torches, herbs, cloth/trophy materials, glimmer gems, and existing housing resources.
- Added `homePreparationSummary` to summarize return-home value across rest, storage, stations, garden, recall, lighting, and trophies.
- Added `homeCraftDurationMultiplier` and wired crafting duration to matching home stations in the housing area.
- Updated BuildPanel with a compact `Next Trip Prep` summary showing reasons, storage slots, garden count, trophy count, and station bonus.
- Added deterministic browser smoke coverage in `artifacts/playwright-runner/097-housing-homestead-smoke.mjs`.

## Verification Evidence

Focused RED/GREEN:

- RED: `npm test -- src\systems\housing-system.test.ts` initially failed on the inactive tier 3 name/upgrade block, missing functional objects, and missing preparation summary.
- GREEN: `npm test -- src\systems\housing-system.test.ts`
  - Result: 1 file, 10 tests passed.

Full gates:

- `npm test`
  - Result: 71 files, 316 tests passed.
- `npm run test:perf-ui`
  - Result: 12 files, 64 tests passed.
- `npm run build`
  - Result: passed. Existing Vite large chunk warning remains.
- `$env:BASE_URL='http://127.0.0.1:4173/'; node artifacts\playwright-runner\097-housing-homestead-smoke.mjs`
  - Result: passed.
  - Smoke coverage: housing teleport, build mode, placement of rest/storage/workbench/tool/garden/recall/trophy pieces, BuildPanel prep summary, Homestead upgrade, unchanged owner-only permissions, garden/storage registration, home anchor/recall marker, no debug UI leak, and performance budgets.
  - Smoke screenshot: `artifacts/playwright-runner/097-housing-homestead-smoke.png`.
  - Smoke render stats: 138 draw calls, 136 meshes, 15 visible entities, 58 raycast candidates, 359 DOM nodes, 6.5ms estimated frame time.
  - Budget: 450 draw calls, 1200 meshes, 160 visible entities, 900 raycast candidates, 1800 DOM nodes, 16.7ms estimated frame time.

## Stack-Realistic Decisions

- Homestead vendor stalls and guest permissions were not implemented because the prompt explicitly marks them as later.
- Trophy identity is represented through placed trophy hooks and trophy wall pieces using rare/dungeon-adjacent materials; no separate equipped-trophy mannequin pipeline was added.
- Crafting convenience uses the existing crafting job pipeline and station types instead of adding a parallel housing crafting system.
- The home station bonus affects duration only, is limited to the housing area, requires a matching placed station, and is capped at 8%.
- Existing placement validation, collision, road-blocking checks, and storage cap systems were reused instead of creating housing-specific bypass rules.

## Not Done

- No vendor stall economy loop was added.
- No guest/visitor permissions UI or multiplayer permissions model was added.
- No direct equipped-item mannequin/trophy sync was added; trophy display remains build-piece based.
- No long manual post-dungeon economy session was recorded beyond deterministic unit and browser smoke coverage.

## Risks / Follow-Up

- Homestead upgrade pacing may need tuning after longer economy sessions with real work-order completion rates.
- The 8% station bonus is intentionally conservative; it should be revisited only after crafting queue pacing is measured.
- BuildPanel density increased with prep summary and may need mobile polish if housing becomes a frequent mobile surface.
- Trophy display fidelity can be expanded later if equipped trophies need direct visual sync.
- Existing nonblocking Vite large chunk warning remains outside prompt 97.
