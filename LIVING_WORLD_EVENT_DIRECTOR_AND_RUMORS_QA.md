# Prompt 98 - Living World Event Director And Rumors QA

Prompt 98 adds a lightweight living-world event director so Briarbrook and nearby areas feel reactive without becoming a full ecosystem simulation.

## Scope

- Events are short-lived, rule-backed hooks that reuse existing areas, NPCs, enemies, economy, Journal, Map, Market Board, and chat.
- Rumors point to true or partially true playable leads instead of random flavor only.
- Player response can mean combat cleanup, profitable turn-ins, gathering at a rumored location, road protection, or choosing to ignore the event until it expires.
- No full NPC life simulation, complex per-NPC schedules, or opaque random timers were added.

## Acceptance Checklist

- [x] Event director supports merchant caravan, bandit ambush, crypt spillover, market day, rare ore rumor, storm/night danger, guard patrol, healer shortage, and mage reagent request.
- [x] Each event has trigger conditions, duration, affected locations, visible change, rumor text, rumor sources, gameplay hooks, economy impact, and cleanup text in `livingWorldEventDefinitions`.
- [x] Events announce through Rumors chat and discovered rumor state.
- [x] Discovered rumors surface in Journal and expanded Map markers.
- [x] Event demand surfaces on the Market Board.
- [x] Combat pressure can be resolved by player response: clearing an event ambush removes the event and records a resolved event log entry.
- [x] Time expiry cleans event entities and records completed/expired event history.
- [x] Storm at night lowers visibility, increases stealth dynamics, and raises danger.
- [x] Existing locations now get revisit reasons across road, crypt, forest, town, bank, blacksmith, and housing/river plot.

## Implementation Summary

- Extended `WorldEventType` with:
  - `guard_patrol`
  - `healer_shortage`
  - `mage_reagent_request`
- Exported `livingWorldEventDefinitions` as the event director contract.
- Added event metadata for all current director events:
  - trigger conditions;
  - affected locations;
  - visible world change;
  - rumor truth level;
  - rumor sources;
  - gameplay hooks;
  - economy impact;
  - cleanup behavior.
- Added visible event hooks:
  - patrol guard on Old River Road;
  - clinic runner in Briarbrook;
  - mage apprentice near Orren;
  - existing caravan trader, bandit, skeleton, traveler, rare ore pressure, and market day hooks remain active.
- Added economy demand cycles for guard patrol, healer shortage, mage reagent request, and rare ore rumor.
- Added `dangerModifier` to world time and wired storm/night danger into time state and enemy aggro radius.
- Added `resolvedEventLog` to world state, save migration, event expiry cleanup, and player-response cleanup.
- Updated Journal completed events to use `resolvedEventLog`.
- Fixed `LoopGovernor` dirty signatures so Journal and Market Board rerender when rumors, resolved events, demand signals, or work orders change.
- Added `DEV_TRIGGER_WORLD_EVENT` for deterministic automation without adding normal-mode debug buttons.

## Verification Evidence

Focused RED/GREEN:

- RED: `npm test -- src\systems\living-world.test.ts` initially failed on missing event director export, missing guard/healer/mage events, missing storm danger modifier, and missing resolved event log.
- GREEN: `npm test -- src\systems\living-world.test.ts`
  - Result: 1 file, 7 tests passed.
- Focused regression after UI/demand wiring:
  - `npm test -- src\game\loop-governor.test.ts src\systems\living-world.test.ts src\ui\journal-codex.test.ts`
  - Result: 3 files, 17 tests passed.
  - `npm test -- src\systems\living-world.test.ts src\systems\economy.test.ts`
  - Result: 2 files, 20 tests passed.

Full gates:

- `npm test`
  - Result: 71 files, 320 tests passed.
- `npm run test:perf-ui`
  - Result: 12 files, 64 tests passed.
- `npm run build`
  - Result: passed. Existing Vite large chunk warning remains.
- `$env:BASE_URL='http://127.0.0.1:4173/'; node artifacts\playwright-runner\098-living-world-event-director-smoke.mjs`
  - Result: passed.
  - Smoke coverage: guard patrol, healer shortage, mage reagent request, storm, rare ore, bandit ambush, Journal rumors, expanded Map rumor markers, Market Board demand signals, pinned rumor state, player-response ambush cleanup, resolved event log, no debug UI leak, and performance budgets.
  - Smoke screenshot: `artifacts/playwright-runner/098-living-world-event-director-smoke.png`.
  - Smoke render stats: 334 draw calls, 400 meshes, 34 visible entities, 184 raycast candidates, 849 DOM nodes, 10.7ms estimated frame time.
  - Budget: 450 draw calls, 1200 meshes, 160 visible entities, 900 raycast candidates, 1800 DOM nodes, 16.7ms estimated frame time.

## Stack-Realistic Decisions

- Event behavior is metadata-driven and deterministic enough for testing; it does not add a random life sim.
- Rumors reuse existing chat, Journal, Map, and Market Board systems instead of adding a separate rumor UI.
- Visible world changes are small spawned hooks or existing resource/economy modifiers, not new bespoke area art.
- Event cleanup is explicit and bounded: event entities are removed on expiry or player-response resolution.
- `DEV_TRIGGER_WORLD_EVENT` is automation-only and does not add a visible debug button in normal mode.

## Not Done

- No full ecosystem simulation or complex NPC schedule graph was added.
- No long-form authored event quest chains were added.
- No new world area or new bespoke art set was created for events.
- Guard patrol does not yet physically escort the player or suppress bandit spawn rates beyond current visible patrol/demand hooks.
- Healer and mage events request supplies through existing work-order/economy surfaces rather than spawning unique quest objectives.

## Risks / Follow-Up

- Event durations and demand multipliers are conservative first-pass tuning and need longer play pacing checks.
- Multiple open windows can overlap during automation; this was handled in smoke without changing normal-mode layout.
- Storm danger now affects aggro radius through `dangerModifier`; manual combat feel should verify it is noticeable without becoming punishing.
- Resolved event history is capped to the latest 12 entries and may need categorization if event volume grows.
- Existing nonblocking Vite large chunk warning remains outside prompt 98.
