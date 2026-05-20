# Prompt 100 - Profession Contracts Mastery And Long Term Goals QA

Prompt 100 adds classless profession contracts and long-term mastery direction without turning the Profession Atlas into passive-tree bloat.

## Scope

- Contracts are direction lenses, not classes.
- Players can accept, swap, abandon, and pin a contract without locking skills or spending points.
- Contract progress is derived from real game state: skills, inventory/bank items, discoveries, housing pieces, work orders, market activity, spell knowledge, and telemetry.
- Profession Atlas shows contract progress next to the existing relationship map.
- Journal can pin a contract next step as the current profession goal.

## Acceptance Checklist

- [x] Added seven contracts: Ranger, Smith, Treasure Hunter, Field Medic, Hedge Mage, Builder, and Trader.
- [x] Each contract teaches a playstyle and uses 3-6 skills.
- [x] Each contract has short objectives and rewards in reputation, recipe/milestone/title/work-order-tier/station-efficiency/UI-preview lanes.
- [x] Contracts can be accepted, swapped, abandoned, and pinned.
- [x] No contract locks class identity, disables other skills, or adds point spending.
- [x] Mastery remains tied to real play: skill thresholds, activity counts, discovery, housing placement, work orders, spell knowledge, and crafted/resource state.
- [x] Profession Atlas shows contract progress, related skills/tools, and pin controls.
- [x] Journal shows pinned contract next step.
- [x] Contract rewards avoid repeated passive percentage spam.

## Implementation Summary

- Added `professionContracts` and `deriveProfessionContractProgress` to `src/data/professions.ts`.
- Added the Trader profession cluster so the Trader contract has a real Atlas lens.
- Added a `trader_broker` mastery milestone for local demand/work-order play.
- Added `activeProfessionContractId` to UI state, save migration, and LoopGovernor dirty signatures.
- Added `ACCEPT_PROFESSION_CONTRACT` and `ABANDON_PROFESSION_CONTRACT` actions.
- Updated `Simulation` to support accept/swap/abandon flows and keep skills classless.
- Updated `SkillsPanel` with a compact Profession Contracts board inside the Profession Atlas.
- Updated `JournalPanel` profession goal descriptions so `contract:<id>` pins show live next-step progress.
- Added browser smoke automation for contract board rendering, Trader pinning, Builder swap/abandon/start, Journal pin, and budgets.

## Verification Evidence

Focused RED/GREEN:

- RED: `npm test -- src\ui\profession-ui.test.ts`
  - Initially failed 4 new tests for missing contract definitions, progress derivation, accept/swap/abandon state, and Atlas contract UI.
- GREEN: `npm test -- src\ui\profession-ui.test.ts`
  - Result: 1 file, 9 tests passed.
- Related regression:
  - `npm test -- src\systems\ProfessionSystem.test.ts src\ui\skill-graph.test.ts src\ui\profession-ui.test.ts`
  - Result: 3 files, 15 tests passed.
  - `npm test -- src\game\save-load.test.ts src\game\loop-governor.test.ts src\ui\journal-codex.test.ts`
  - Result: 3 files, 13 tests passed.

Full gates:

- `npm test`
  - Result: 71 files, 329 tests passed.
- `npm run test:perf-ui`
  - Result: 12 files, 68 tests passed.
- `npm run build`
  - Result: passed. Existing Vite large chunk warning remains.
- `$env:BASE_URL='http://127.0.0.1:4173/'; node artifacts\playwright-runner\100-profession-contracts-smoke.mjs`
  - Result: passed.
  - Smoke coverage: Atlas contract board, Trader contract accept/pin to Journal, Builder lens switch, Builder swap/abandon/start flow, live Builder progress from played state, no class-lock/point-spend copy, no debug UI leak, and performance budgets.
  - Smoke screenshot: `artifacts/playwright-runner/100-profession-contracts-smoke.png`.
  - Smoke render stats: 334 draw calls, 400 meshes, 34 visible entities, 184 raycast candidates, 642 DOM nodes, 134 Atlas modal nodes, 10.7ms estimated frame time.
  - Budget: 450 draw calls, 1200 meshes, 160 visible entities, 900 raycast candidates, 1800 DOM nodes, 900 Atlas modal nodes, 16.7ms estimated frame time.

## Stack-Realistic Decisions

- Contracts reuse existing telemetry, inventory, skills, world, Journal, and Atlas state instead of adding a new progression database.
- Rewards are descriptive unlock lanes for future systems; they do not grant hidden stat multipliers now.
- Trader was added as a real Atlas lens because prompt 100 explicitly requires Trader contract direction.
- The contract board is compact and scoped to the selected/active lens so the Atlas stays usable.
- Pinning uses the existing `pinnedProfessionGoalId` mechanism with `contract:<id>` identifiers.

## Not Done

- No new reward-claim screen was added.
- No hard recipe gating or vendor price gating was added.
- No permanent title/cosmetic equip UI was added.
- No passive percentage stacking was added.
- No new contract quest chain or bespoke NPC dialogue tree was added.

## Risks / Follow-Up

- Contract objective thresholds are first-pass and should be tuned after longer play sessions.
- Reward lanes are intentionally recorded as contract metadata; later prompts can wire them into recipe/work-order/vendor unlocks.
- Contract board density inside Atlas should be watched on small screens as more contracts are added.
- Existing nonblocking Vite large chunk warning remains outside prompt 100.
