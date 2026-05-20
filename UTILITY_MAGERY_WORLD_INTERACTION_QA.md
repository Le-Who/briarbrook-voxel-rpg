# Utility Magery And World Interaction QA - Prompt 94

Prompt 94 expands Magery as a world-interaction language instead of only a damage lane. The implementation keeps magic useful in exploration, dungeons, travel, combat setup, and support while preserving Lockpicking, Detect Hidden, Remove Trap, and other profession value.

## Acceptance Criteria

- [x] The utility spell set covers 12 practical spells: `night_sight`, `reveal`, `telekinesis`, `detect_magic`, `dispel_field`, `unlock_minor`, `magic_lock`, `mark_minor_rune`, `recall`, `protection`, `cure`, and `create_food`.
- [x] Every spell has mana cost, reagents, circle/tier, Magery requirement, range, line-of-sight metadata, cast time, fizzle chance through Magery difficulty, skill gain hook, and readable failure reasons.
- [x] Night Sight improves exploration by revealing subtle dungeon marks without fully opening hidden containers or replacing Reveal/Detect Hidden.
- [x] Reveal and Detect Magic expose hidden/trapped/warded objects for a duration.
- [x] Telekinesis can trigger traps safely at range and open simple safe containers from range.
- [x] Unlock Minor opens weak locks but does not replace Lockpicking on valuable/complex treasure chests.
- [x] Magic Lock can lock simple unopened containers but fails on protected, hidden, trapped, valuable, or magically sealed containers.
- [x] Dispel Field removes magic fields, stone walls, and visible magical seals.
- [x] Mark/Recall use reagents/cast times and safe-point rules instead of debug travel.
- [x] Spellbook separates Damage, Utility, Travel, Support, Control, and Debuff roles.
- [x] Spellbook castability preview exposes mana, reagents, skill requirement, range, LoS, cast time, cooldown, and disabled reasons.
- [x] Hotbar spell state communicates targeting mode.

## Implemented

- Added `magic_lock` as a second-circle utility spell.
- Added safe Mark/Recall preflight:
  - Mark only works in town, bank, smithy, or housing safe/service areas.
  - Recall requires an existing safe mark.
  - Travel magic is blocked while under immediate damage pressure.
- Changed Recall from defaulting to town into returning to the marked safe rune point.
- Night Sight now calls a subtle-mark reveal path that records nearby secret clue state but leaves hidden/sealed containers closed and profession-relevant.
- Telekinesis now handles more than traps:
  - triggers armed traps from range;
  - opens simple unlocked/untrapped containers from range;
  - refuses hidden, locked, protected, magically sealed, or already opened containers with clear prompt text.
- Added line-of-sight failure handling for hidden entity spell targets.
- Added Support spellbook role and remapped food/heal/cure/protection/strength/night-sight/water-walk style spells into Support.
- Kept Control and Debuff filters for spell planning without turning the spellbook into a generic dashboard.

## Balance Notes

- Unlock Minor still refuses high-value/complex locks above the current low-lock threshold.
- Magic Lock only applies a weak lock to simple, visible, unopened, unprotected containers.
- Night Sight reveals clue state only; it does not unhide the false door or remove magical barriers.
- Telekinesis does not bypass locks or magical seals. It opens only safe containers and handles traps as a safety tool.
- Marking is restricted to safe/service/housing areas. Recall is travel to a player-marked safe point, not arbitrary teleport.

## UI Notes

- Spellbook role filters now include:
  - Damage
  - Utility
  - Travel
  - Support
  - Control
  - Debuff
- Spell detail already shows the castability surface required by the prompt:
  - mana;
  - Magery requirement;
  - range;
  - line-of-sight;
  - cast/cooldown;
  - reagent readiness;
  - disabled cast reason.
- Hotbar spell slots show invalid state, cooldown, mana cost, and targeting badge.

## Browser Smoke

Runner:

```powershell
$env:BASE_URL='http://127.0.0.1:4173/'; node artifacts\playwright-runner\094-utility-magery-smoke.mjs
```

Coverage:

- Opens Spellbook and verifies Support/Utility/Travel filters and spell castability preview fields.
- Starts Telekinesis targeting and verifies the active hotbar targeting badge.
- Casts Night Sight in the crypt and verifies subtle false-door clue state without direct opening.
- Uses Detect Magic and Dispel Field to remove the false-door magical barrier.
- Uses Magic Lock, Unlock Minor, and Telekinesis on a simple cache.
- Attempts Mark in an unsafe crypt context, then marks town safely and Recalls from Old River Road to that mark.
- Verifies no debug UI leaks into normal mode.
- Checks renderer/DOM performance budgets.

Smoke performance evidence:

| Draw Calls | Meshes | Visible Entities | Raycast Candidates | DOM Nodes | Estimated Frame |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 289 / 450 | 379 / 1200 | 32 / 160 | 162 / 900 | 409 / 1800 | 10.0 ms / 16.7 ms |

Observed non-blocking automation warnings:

- Content validation is currently clean with 0 warnings.
- Browser AudioContext autoplay warning before user gesture.
- Chromium `ReadPixels` performance warnings during automated WebGL capture.

## Verification

Red/green:

- `npm test -- src\systems\magic-utility.test.ts src\ui\SpellbookPanel.test.ts` initially failed on the missing 94 contracts: `magic_lock`, Night Sight subtle marks, Telekinesis simple-container opening, Mark/Recall safe-point rules, and Support spellbook role.
- The same command passed after implementation: 2 files, 12 tests.

Focused checks:

- `npm test -- src\systems\magic-utility.test.ts src\ui\SpellbookPanel.test.ts src\ui\ui-state-architecture.test.ts src\ui\Hotbar.ts src\systems\treasure-system.test.ts src\game\save-load-regression.test.ts` passed: 5 files, 29 tests.
- `npm run build` passed with the existing Vite large chunk warning.
- `node artifacts\playwright-runner\094-utility-magery-smoke.mjs` passed against `http://127.0.0.1:4173/`.

Final full gate:

- `npm test` passed: 69 files, 301 tests.
- `npm run test:perf-ui` passed: 12 files, 64 tests.
- `npm run build` passed with the existing Vite large chunk warning.
- `node artifacts\playwright-runner\094-utility-magery-smoke.mjs` passed against `http://127.0.0.1:4173/`.

## Stack-Realistic Decisions

- No new runtime dependency was added for spell UI or world interactions.
- Magic Lock is implemented as a simple container-state modifier instead of introducing a separate door-lock subsystem before the world has authored lockable doors.
- Night Sight uses persistent treasure secret clue state for subtle marks instead of adding a new visual-only clue registry.
- Telekinesis reuses existing container and trap systems rather than adding a parallel remote-interaction framework.

## Not Done

- No full authored lever/switch puzzle chain was added; Telekinesis now has the container/trap/loot side of the contract and can be extended to levers when authored lever entities exist.
- No new travel map UI was added for Recall; it uses the current marked safe point state.
- No new spell VFX asset pack was created.
- No long manual mage-only dungeon playtest was recorded.

## Remaining Risks

- Recall may need a richer rune UI once multiple marks or crafted rune books exist.
- Magic Lock should be revisited before multiplayer because remote locking has griefing implications.
- Night Sight clue radius and reward value may need tuning after longer dungeon playtests.
- The Vite large chunk warning remains a non-blocking cleanup item outside prompt 94; content validation is currently clean.
