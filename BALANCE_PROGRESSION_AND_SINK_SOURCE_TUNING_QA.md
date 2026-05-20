# Balance Progression And Sink Source Tuning QA

Prompt: 105-balance-progression-and-sink-source-tuning
Date: 2026-05-20

## Scope

- Added first-hour progression and economy rate reporting in `createProgressionBalanceReport`.
- Added anti-exploit economy audit in `auditEconomyExploits`.
- Added telemetry for durability loss, work-order completion time, combat engagement start, and combat time-to-kill.
- Wired telemetry recording through economy, combat, gathering tool wear, work orders, and spell reagent consumption.
- Tuned vendor round-trip pricing so cheap stacked goods remain loss-making after rounding.
- Tuned fastest resource respawns from 16s to 18s to keep onboarding quick without tight respawn abuse.
- Surfaced the new rates, TTK/order timing, housing T1 estimate, and exploit counts in the dev overlay.

## Measured Signals

- gold/hour
- resource/hour
- skill gains/hour
- item durability loss/hour
- reagent consumption/hour
- death rate/hour
- work order completion time
- housing Tier 1 material acquisition time
- combat time-to-kill
- healing consumption/hour

## Acceptance Criteria

- First-hour targets are represented by `firstHourBalanceTargets`.
- The shipped slice has zero critical anti-exploit findings.
- Vendor buy/sell round trips are loss-making for cheap stacked goods.
- Resource respawns remain at or above the 18s loop guard.
- Work orders retain hybrid rewards and first-hour raw gold remains capped.
- Save/load normalizes new telemetry fields for older saves.

## Verification

- RED: `npm test -- src\systems\balance-system.test.ts` failed on missing progression telemetry/report APIs.
- RED: `npm test -- src\systems\balance-system.test.ts` failed on cheap vendor round-trip spread and 16s resource respawns before tuning.
- GREEN focused: `npm test -- src\systems\balance-system.test.ts src\systems\economy.test.ts src\systems\telemetry-health.test.ts src\game\save-load.test.ts` passed, 4 files / 31 tests.
- Full tests: `npm test` passed, 75 files / 350 tests.
- Perf/UI: `npm run test:perf-ui` passed, 12 files / 69 tests.
- Content validation: `npm run content:validate` passed, 0 errors / 18 existing warnings.
- Build: `npm run build` passed with the existing large chunk warning.

## Done

- Prompt-required measurements are available as a single report object and in dev overlay.
- Gameplay systems now feed the measurements instead of relying on static guesses.
- Anti-exploit checks cover market arbitrage, vendor arbitrage, work-order spam, free repair loops, resource respawn abuse, and save/load duplicate work-order state.
- Balance tuning is intentionally conservative and does not alter the Golden Path structure.

## Not Done

- No exhaustive automated 3-hour playthrough simulator was added.
- Loot table structure was not changed; current gold flow is measured through gold/hour and anti-inflation checks.
- Existing content validation warnings from prior prompts remain unchanged.

## Remaining Risks

- Target thresholds are practical slice targets, not final economy constants; they should be recalibrated after real playtest telemetry.
- Housing Tier 1 acquisition uses a conservative fallback estimate when a save has no measured resource/hour yet.
- Vite still reports the pre-existing large chunk warning.
