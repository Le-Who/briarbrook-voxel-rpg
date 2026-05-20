# Prompt 96 - Local Economy Work Orders And Item Sinks QA

Prompt 96 deepens the solo/small-scale local economy without adding a global auction house.

## Scope

- NPC demand, work orders, item sinks, repair, consumables, regional price variation, and modest buy/sell remain simulated local systems.
- Work orders now use service-facing categories instead of only raw item classes.
- Demand cycles are driven by local world events and surface as readable Market Board signals.
- Fulfillment can draw from inventory or bank when the player is near the bank/town market service.

## Acceptance Checklist

- [x] Gathering has reasons beyond self-equipping through service work orders for logs, boards, ore, herbs, food, arrows, lockpicks, and valuables.
- [x] Crafting and repair have economy sinks through durability, repair materials, tools, arrows, reagents, bandages, food, torches, lockpicks, housing materials, and work-order turn-ins.
- [x] Work order categories cover Smithy, Healer, Mage, Guard, Carpenter, Tavern, and Banker/Merchant.
- [x] Local events affect demand: bandit raids, crypt activity, storms, caravans, and market day all create demand signals and price pressure.
- [x] Rewards avoid raw gold inflation and include modest gold, reputation, recipes, resource vouchers, discounts, and profession skill progress.
- [x] Market Board shows categories, requirements, rewards, time remaining, demand signals, bank access, and work-order pin controls.
- [x] Pinned work orders surface in the Journal.
- [x] Nearby bank fulfillment works for work orders and market buy orders; remote forest fulfillment does not use bank stock.
- [x] No global auction house or multiplayer market dependency was added.

## Implementation Summary

- Extended economy types with service categories, demand signals, unlocked recipe rewards, and active discount rewards.
- Added service category labels and upgraded work orders across Smithy, Healer, Mage, Guard, Carpenter, Tavern, and Banker/Merchant lanes.
- Added reward metadata:
  - recipe unlock hooks;
  - voucher item rewards;
  - temporary local service discounts.
- Added event-driven demand cycles in `EconomySystem` and connected them to `LivingWorldSystem`.
- Updated market pricing so event demand can shift prices without permanently inflating baseline demand after signals expire.
- Added bank-nearby inventory access for work order and market buy-order fulfillment, with bank stock consumed first when available.
- Added `PIN_WORK_ORDER` action, UI click handling, Journal display, and save migration for `pinnedWorkOrderId`.
- Upgraded Market Board UI with service labels, demand chips, reward/time/bank-access details, and pin buttons.
- Added save-load migration defaults for `demandSignals`, `unlockedRecipeIds`, and `activeDiscounts`.

## Verification Evidence

Focused RED/GREEN:

- RED: `npm test -- src\systems\economy.test.ts` initially failed on missing service categories/reward types, missing `applyEconomyEventDemand`, missing bank fulfillment, and missing demand/pin UI.
- GREEN: `npm test -- src\systems\economy.test.ts` passed after implementation.
  - Result: 1 file, 13 tests passed.

Full gates:

- `npm test`
  - Result: 71 files, 313 tests passed.
- `npm run test:perf-ui`
  - Result: 12 files, 64 tests passed.
- `npm run build`
  - Result: passed. Existing Vite large chunk warning remains.
- `$env:BASE_URL='http://127.0.0.1:4173/'; node artifacts\playwright-runner\096-local-economy-smoke.mjs`
  - Result: passed.
  - Smoke coverage: service category labels, demand chip, reward/time/bank-access text, work-order pin to Journal, bank-backed guard arrow work order, bank-backed logs market buy order, transaction logging, discount reward, no debug UI leak.
  - Smoke render stats: 71 draw calls, 71 meshes, 3 visible entities, 27 raycast candidates, 575 DOM nodes, 5.3ms estimated frame time.
  - Budget: 450 draw calls, 1200 meshes, 160 visible entities, 900 raycast candidates, 1800 DOM nodes, 16.7ms estimated frame time.

## Stack-Realistic Decisions

- No auction house, server market, or networking dependency was introduced.
- Demand cycles are small deterministic local multipliers attached to existing world events.
- Recipe rewards are tracked in economy state for progression contracts; the current crafting UI is not gated behind those unlocks yet to avoid breaking existing Golden Path recipes.
- Bank fulfillment is allowed only in bank/town/explicit bank-panel context, preserving risk when gathering in the forest or road.
- Existing durability, repair, consumable, and telemetry systems were reused instead of adding a parallel economy ledger.

## Not Done

- No global auction house or player-to-player market was added.
- No new vendor NPC art, new building, or new world area was added.
- No long-form manual economy playtest was recorded beyond deterministic browser smoke.
- Active discounts are recorded and surfaced in state, but broad vendor-price UI surfacing can be expanded in a later merchant polish pass.

## Risks / Follow-Up

- Event demand multipliers are conservative first-pass tuning and need manual economy pacing checks after longer gathering/crafting sessions.
- Recipe unlock rewards currently record progression state without hard-locking existing recipes; a future recipe-gating pass should avoid breaking Golden Path crafting.
- Market Board density is higher than normal HUD play, so mobile layout should be revisited if the economy board becomes a frequent mobile surface.
- Existing nonblocking Vite large chunk warning remains outside prompt 96.
