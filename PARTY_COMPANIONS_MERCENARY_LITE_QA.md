# Prompt 101 - Party, Companions, And Mercenary-Lite QA

## Scope

Prompt 101 adds a shallow first-hour companion layer, not a pet/taming or MMO party backend.

Implemented:
- Temporary hire/join flow for NPC/social companions through `HIRE_COMPANION` and the existing context-menu Follow command.
- Four companion roles: Guard, Archer, Healer, Scout.
- Commands: Follow, Hold, Assist, Passive, Dismiss.
- Party member state stored on NPC entities plus `world.partyMemberIds` for save/load.
- Non-blocking active companions, safe regroup near the player, portal/trap avoidance, stuck recovery repositioning.
- Modest assist damage that cannot kill enemies or spawn loot.
- Healer support for basic heals and downed-player revive.
- Scout hidden-clue/trap hint behavior.
- Compact party frame with health, mana, role badge, command dropdown, and dismiss action.

Explicitly not implemented:
- Pet taming.
- Companion progression trees.
- Companion inventory.
- Romance/story arcs.
- Multiplayer party backend.

## Acceptance Criteria

- A companion can support the first-hour/dungeon slice without becoming a new deep system: covered by unit, UI, save/load, and browser smoke checks.
- Companion AI does not block doors/portals: active companions set `blocksMovement=false` and safe regroup avoids portal tiles.
- Companion AI avoids repeated trap triggering: safe movement/regroup avoids active trap fields.
- Companions do not steal loot or trivialize combat: assist damage is capped at 1 enemy HP minimum and never calls enemy kill/loot flow.
- Party UI remains shallow: one compact HUD cluster, dropdown commands only.

## Verification

- `npm test -- src\systems\companion-system.test.ts src\ui\party-frame.test.ts`: passed, 6 tests.
- `npm test -- src\systems\companion-system.test.ts src\ui\party-frame.test.ts src\game\save-load.test.ts`: passed, 10 tests.
- `npm test -- src\systems\companion-system.test.ts src\ui\party-frame.test.ts src\game\save-load.test.ts src\systems\combat-encounter-roles.test.ts src\game\golden-path.test.ts src\game\loop-governor.test.ts src\ui\hud-hierarchy.test.ts src\ui\dom-rendering-budget.test.ts`: passed, 8 files / 33 tests.
- `npm test`: passed, 73 files / 336 tests.
- `npm run test:perf-ui`: passed, 12 files / 69 tests.
- `npm run build`: passed. Existing Vite large chunk warning remains.
- `node artifacts\playwright-runner\101-party-companion-smoke.mjs`: passed.
  - Party members: `npc_liora_town`, `npc_durnok_town`.
  - Assist cap: bandit left at 1 HP, not dead, no loot flow.
  - Revive: player restored to 25.06 HP, Durnok mana spent 76 -> 56.
  - Browser budget snapshot: 212 draw calls, 217 meshes, 19 visible entities, 123 raycast candidates, 321 DOM nodes, 8.0ms estimated frame.

## Risks

- Companion combat intentionally stays conservative; it supports the player but does not provide full threat/tank simulation.
- Healer revive is automatic and basic; no separate revive targeting UI was added.
- Active companion state is saveable, but the system is still scoped to local solo play and does not imply networking readiness.
