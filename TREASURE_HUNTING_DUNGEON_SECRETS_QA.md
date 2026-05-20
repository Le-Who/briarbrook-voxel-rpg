# Treasure Hunting Dungeon Secrets QA - Prompt 93

Prompt 93 implements the first major gameplay-depth pillar: a complete treasure and dungeon-secret loop that reuses existing areas, skills, UI, save/load, and economy sinks without adding a new dungeon.

## Core Loop Acceptance

- [x] Treasure maps/rumors exist as tiered map definitions and selectable Treasure Map UI states.
- [x] Cartography and Tracking narrow clue precision and support map pinning.
- [x] Existing areas support travel targets: Briarbrook, Greymont Forest, Old River Road, Briarbrook Bank, and Forgotten Crypt.
- [x] Detect Hidden and Reveal expose hidden caches, disturbed soil, traps, false walls, and secret containers.
- [x] Lockpicking opens locked treasure containers after trap handling.
- [x] Remove Trap disarms revealed traps, while Telekinesis can safely trigger a trap from range.
- [x] Detect Magic identifies magical seals and Dispel Field removes the false-door barrier.
- [x] Rewards feed current systems: reagents, scroll/lore clues, crafting materials, rare resources, work-order items, modest gold, and housing display trophies.
- [x] Journal/map feedback records treasure clues and provides non-pixel-hunt ambiguity.
- [x] Save/load persists revealed secrets, opened containers, disarmed/triggered traps, map clue state, and exposed buried cache state.

## Content Matrix

| Requirement | Implemented Content |
| --- | --- |
| 3 treasure map tiers | Tier 1 `greymont_cache`, Tier 2 `old_river_bandit_stash`, Tier 3 `crypt_reliquary`. |
| 5 hidden cache locations | `town_fountain_cache`, `greymont_buried_cache`, `old_river_bandit_stash`, `bank_ledger_cache`, `crypt_loose_wall`, plus crypt reliquary and false-door secrets. |
| 3 locked/trapped chests | `cache_road_hidden`, `door_crypt_side_room`, `chest_crypt_warded`, `chest_crypt_secret_room`, and spawned `treasure_greymont_cache`. |
| 2 secret crypt doors/walls | `crypt_loose_wall` and `crypt_false_door`, with the existing sealed alcove/reliquary layer retained. |
| 1 buried cache in Greymont | `greymont_buried_cache` spawns `treasure_greymont_cache` through shovel excavation. |
| 1 old bandit stash on Old River Road | `old_river_bandit_stash` reveals and opens `cache_road_hidden`. |
| 1 crypt reliquary | Tier 3 `crypt_reliquary` and `chest_crypt_warded` are available through Detect Magic/Reveal. |
| No new dungeon | All content is placed in existing town, road, forest, bank, and crypt spaces. |

## Skill Integration

- Cartography: `decipherTreasureMap` reads tiered map clues, records precision, and supports pinning.
- Tracking: contributes to treasure-map precision and trains alongside Cartography.
- Detect Hidden: reveals hidden containers, traps, disturbed soil, loose walls, and road/crypt/town/bank caches.
- Lockpicking: opens locked treasure containers after trap safety is resolved.
- Remove Trap: disarms armed revealed traps and records secret runtime state.
- Reveal: uses the existing magery reveal path to expose hidden containers/secrets.
- Telekinesis: triggers armed container traps from a safer range.
- Detect Magic: reveals magical treasure auras and sealed crypt containers.
- Dispel Field: removes the `secret_crypt_false_door` magical barrier.

## Rewards And Economy

- Gold stays modest: treasure containers use small-to-medium gold values rather than raw gold inflation.
- Loot tables emphasize system-fed rewards: reagents, `parchment_scroll`, `crypt_lore_clue`, `repair_kit`, `vendor_contract`, `glimmer_gem`, `wall_tapestry`, and `treasure_map_display_kit`.
- Housing display support is represented by `treasure_map_display_kit` and existing display/trophy pieces.
- Profession progress is reinforced through skill events and the Treasure Hunter profession milestone path.

## Save Load Coverage

Persisted state includes:

- `world.treasure.maps.*.fragmentCount`, `decipheredPrecision`, `found`, `pinned`, and `lastCheckedAt`.
- `world.treasure.secrets.*.revealedUntil`, `disarmed`, `triggered`, and `opened`.
- Container `opened`, `hidden`, `locked`, `trap.armed`, and magical barrier state.
- Spawned Greymont buried cache entity state after excavation.

## Browser Smoke

Runner:

```powershell
$env:BASE_URL='http://127.0.0.1:4173/'; node artifacts\playwright-runner\093-treasure-secrets-smoke.mjs
```

Coverage:

- Opens the tiered Treasure Map panel and verifies all three tier buttons exist.
- Deciphers and pins the Old River Road clue.
- Digs the Greymont buried cache, detects/disarms the trap, opens the cache, and verifies persisted map/cache state.
- Reveals Old River Road stash, triggers the trap with Telekinesis from range, lockpicks/opens it, and verifies the secret is `triggered` and `opened`.
- Opens the crypt treasure room after Detect Hidden and Remove Trap.
- Detects and dispels the false crypt door magical seal.
- Opens Journal and expanded Map surfaces to confirm treasure/map UI remains integrated.
- Saves, reloads, and rechecks map, secret, container, inventory, debug-UI, and performance state.

Smoke performance evidence:

| Phase | Draw Calls | Meshes | DOM Nodes | Estimated Frame |
| --- | ---: | ---: | ---: | ---: |
| Before save | 73 / 450 | 112 / 1200 | 616 / 1800 | 5.8 ms / 16.7 ms |
| After load | 111 / 450 | 184 / 1200 | 614 / 1800 | 6.5 ms / 16.7 ms |

Observed non-blocking automation warnings:

- Existing `tool:torch` MagicaVoxel `sourcePath` content warning.
- Browser AudioContext autoplay warning before user gesture.
- Chromium `ReadPixels` performance warnings during automated WebGL capture.

## Verification

Red/green:

- `npm test -- src/systems/treasure-system.test.ts` initially failed because the prompt 93 tier/content/session persistence did not exist yet.
- `npm test -- src/ui/treasure-map-panel.test.ts` was added to cover the tier selector UI.

Focused checks:

- `npm test -- src/systems/treasure-system.test.ts` passed: 9 tests.
- `npm test -- src/ui/treasure-map-panel.test.ts` passed: 1 test.
- `npm test -- src/tools/production-tools.test.ts src/systems/treasure-system.test.ts src/ui/treasure-map-panel.test.ts src/systems/magic-utility.test.ts src/game/save-load-regression.test.ts` passed: 5 files, 27 tests.
- `npm run build` passed with the existing Vite large chunk warning.
- `node artifacts\playwright-runner\093-treasure-secrets-smoke.mjs` passed against a fresh preview server at `http://127.0.0.1:4173/`.

Final full gate:

- `npm test` passed: 69 files, 296 tests.
- `npm run test:perf-ui` passed: 12 files, 64 tests.
- `npm run build` passed with the existing Vite large chunk warning.
- `node artifacts\playwright-runner\093-treasure-secrets-smoke.mjs` passed against a fresh preview server at `http://127.0.0.1:4173/`.

## Stack-Realistic Decisions

- No Blockbench or MagicaVoxel runtime dependency was added. Treasure content uses data definitions, existing entity/container systems, and existing procedural scene support.
- The map tiers share the current `rough_treasure_map` item surface while tier identity lives in treasure map definitions and the Treasure Map panel. This avoids inventory-model churn in the first depth pass.
- The Old River Road Telekinesis smoke stands outside immediate bandit aggro and triggers the trap from range, matching the intended utility-spell safety loop.
- The crypt false-door smoke stands within Dispel Field range but outside immediate combat pressure so the browser check validates magery utility rather than random combat interruption.

## Not Done

- No new dungeon, new biome, or broad world map expansion was created.
- No authored external 3D asset pack was added for treasure props.
- No full 30-minute manual wall-clock playtest was recorded in this prompt; the acceptance is covered by deterministic unit and browser smoke paths.
- No economy rebalance pass beyond modest reward composition was attempted.

## Remaining Risks

- Longer playtesting may require tuning treasure-map reward rates, lock/trap difficulty, and how often maps/fragments enter the economy.
- The shared `rough_treasure_map` item may need tier-specific inventory affordances if players accumulate many active map objectives later.
- The existing torch `sourcePath` and Vite large chunk warnings remain non-blocking cleanup items outside prompt 93.
- The existing 5173 dev server was stale during smoke debugging; final browser evidence for prompt 93 uses a fresh 4173 preview server.
