# Prompt 95 - Real-Time Combat Encounter Roles And AI QA

## Scope

Prompt 95 upgrades combat from generic fighting into readable real-time encounters that support melee, ranged, mage, healer/support, and rogue/treasure-adjacent builds without becoming twitchy ARPG spam.

## Implementation Summary

- Added `src/data/combatEncounters.ts` as the combat role and first-encounter contract.
- Defined role contracts for Grunt, Brute, Archer, Caster, Skirmisher, Guard/Shield, Support, and Trapkeeper.
- Tuned first encounters:
  - Old River Road bandit pair: Grunt + Archer, with the Brigand as a heavier follow-up brute.
  - Greymont Forest animal/scout: Skirmisher wolf.
  - Mine/Crypt skeleton patrol: Grunts + Brute captain.
  - Crypt shield/caster room: Shield Skeleton + Mage Cultist.
- Extended enemy typing and save migration compatibility for `guard` and `trapkeeper` roles.
- Added role-based telegraph kind, warning color, wind-up duration, preferred distance, and cooldown tuning.
- Added caster interruption on successful melee/ranged pressure, with a visible `Interrupted` float and fizzle VFX.
- Added enemy cast progress to the selected target frame.
- Added shield-front behavior: Guard/Shield enemies strongly block frontal melee and are weak to flanking and magic.
- Added simple preferred-distance AI for ranged/skirmish/support/trapkeeper roles.
- Added simple hazard avoidance so enemies avoid stepping into visible trap fields.
- Added support role utility healing and trapkeeper avoidable trap-field placement.

## Acceptance Checklist

- [x] Encounter roles defined with readable counters and lessons.
- [x] Road bandit pair supports early target priority and ranged pressure.
- [x] Forest scout/animal encounter supports movement and stamina lessons.
- [x] Mine/crypt skeleton patrol supports movement, healing windows, and slow telegraph reads.
- [x] Crypt shield/caster encounter supports target priority, flanking, magic, and interrupts.
- [x] Melee remains tied to positioning, stamina, block/parry, and flank choices.
- [x] Archer remains tied to spacing, line of sight, ammo, and interrupt pressure.
- [x] Mage remains tied to cast timing, mana/reagents, and utility/damage tradeoffs.
- [x] Healer/support play remains represented through bandages, cure/protection, and enemy support counterplay.
- [x] Rogue/treasure hybrid remains represented through traps, locks, field avoidance, evasion, Detect Hidden, and Remove Trap.
- [x] Telegraphs include ground warning, wind-up float, projectile trails, block flash, cast bar, and interrupted spell cue.
- [x] AI chooses targets from current aggro context, maintains preferred distance, uses cooldowns, avoids hazards, and leashes back instead of pathfinding every frame.
- [x] Difficulty avoids unavoidable early damage spikes by using telegraphs, capped early damage, block/evasion windows, and interrupt windows.

## Verification Evidence

Focused RED/GREEN:

- RED: `npm test -- src\systems\combat-encounter-roles.test.ts` failed before implementation on missing role/encounter contract, missing support/trapkeeper behavior, and missing interrupt/shield/kiting expectations.
- GREEN: `npm test -- src\systems\combat-encounter-roles.test.ts` passed after implementation.
- UI RED/GREEN: `npm test -- src\ui\TargetFrame.test.ts` failed before target-frame cast progress and passed after adding `enemy-cast-progress`.

Focused regression gate:

- `npm test -- src\ui\TargetFrame.test.ts src\systems\combat-encounter-roles.test.ts src\systems\combat-layer.test.ts src\game\combat-intent.test.ts src\systems\magic-utility.test.ts src\game\save-load.test.ts src\game\save-load-regression.test.ts`
- Result: 7 files, 32 tests passed.

Full gates:

- `npm test`
  - Result: 71 files, 309 tests passed.
- `npm run test:perf-ui`
  - Result: 12 files, 64 tests passed.
- `npm run build`
  - Result: passed. Existing Vite large chunk warning remains.
- `BASE_URL=http://127.0.0.1:4173/ node artifacts\playwright-runner\095-real-time-combat-smoke.mjs`
  - Result: passed.
  - Smoke roles: road `support`, `archer`, `trapkeeper`; crypt `guard`, `caster`, `brute`.
  - Smoke render stats: 147 draw calls, 150 meshes, 17 visible entities, 105 raycast candidates, 261 DOM nodes, 6.9ms estimated frame time.
  - Budget: 450 draw calls, 1200 meshes, 160 visible entities, 900 raycast candidates, 1800 DOM nodes, 16.7ms estimated frame time.

## Not Done

- No authored multi-room dungeon combat script was added beyond the tuned first-encounter fixtures.
- Trapkeeper is implemented as a reusable role behavior and smoke-tested through a converted road enemy, but no permanent first-hour trapkeeper spawn was added.
- Support role behavior is implemented and tested, but no permanent early support enemy spawn was added to avoid crowding the Golden Path.

## Risks / Follow-Up

- Shield-front detection uses facing yaw and a generous front cone; it may need tuning after manual combat feel testing.
- Support/trapkeeper utilities are intentionally simple and may need encounter-specific cooldown tuning once more enemy packs exist.
- Enemy line-of-sight is still mostly implicit through range/area constraints; richer LoS obstacle behavior can be added in a later combat polish pass.
- Existing nonblocking warnings remain expected unless full gates reveal new failures.
