# Prompt 99 - Reputation Crime Guards Safe Risk Zones QA

Prompt 99 adds PvE-first reputation, crime, guard, and risk-zone foundations without enabling player theft or griefy multiplayer behavior.

## Scope

- Zone rules remain browser/local-state rules for the solo slice.
- Reputation now tracks Briarbrook standing plus merchant, guard, mage, healer, and smith relationship trust.
- Crime MVP is limited to PvE/non-player consequences: protected town theft, suspicious snooping, restricted-room trespass, innocent aggression warnings, enemy stash rogue play, and abandoned/locked container readiness.
- Player-owned stealing and snooping are explicitly blocked.
- Guard feedback is readable through system messages, prompt text, minimap risk, criminal warning, and guard attention state.

## Acceptance Checklist

- [x] Defined Guarded Town, Wilderness, Dungeon, Private Plot, and Event Zone risk rules.
- [x] HUD/minimap shows zone risk and guard attention state.
- [x] Active local danger events elevate wilderness/dungeon areas into Event Zone without overriding guarded town or private plot safety.
- [x] Reputation tracks Briarbrook standing, merchant trust, guard trust, mage trust, healer trust, smith trust, criminal flag, fines, and guard attention.
- [x] Obvious protected theft uses a two-step newcomer confirmation before committing crime consequences.
- [x] Guard response is readable through prompt/system message and criminal minimap warning.
- [x] Attacking civilians/guards remains blocked or warned before consequences.
- [x] Player-owned stealing is disabled for this slice.
- [x] Rogue play has PvE uses through snooping/stealing from enemy stashes, lockpicking/trap-ready containers, stealth-adjacent skill credit, and suspicious container inspection.
- [x] Action consequence preview exists for protected theft, trespass, owned locks, enemy stashes, and player-owned storage.

## Implementation Summary

- Added `event_zone` to zone definitions and introduced `zoneForState` for local active danger events.
- Added relationship trust and guard attention fields to `ReputationState`, initial state, and save migration.
- Added `crimeConsequencePreview` and `crimeFeedbackSummary` as reusable crime UI contracts.
- Updated crime registration to adjust guard attention, guard trust, merchant trust, fines, criminal/suspicious flags, and prompt text.
- Added `attemptTrespassRestrictedRoom` with a confirmation-first flow.
- Updated snooping and stealing rules:
  - player-owned containers are blocked from theft/snooping;
  - enemy-owned containers support PvE rogue actions without criminal flags;
  - protected town containers keep two-step warning and guard response.
- Marked Old Bandit Stash as bandit-owned private PvE rogue content.
- Added minimap and expanded map guard attention feedback.
- Added browser smoke automation for zone risk, player-theft block, enemy stash rogue action, protected theft warning, criminal flag, guard attention, and performance budgets.

## Verification Evidence

Focused RED/GREEN:

- RED: `npm test -- src\systems\crime-system.test.ts`
  - Initially failed 5 new tests for missing `zoneForState`, missing relationship trust fields, missing consequence preview, missing player-theft block, missing enemy-stash rogue handling, and missing trespass helper.
- GREEN: `npm test -- src\systems\crime-system.test.ts`
  - Result: 1 file, 11 tests passed.
- Related regression:
  - `npm test -- src\systems\crime-system.test.ts src\ui\map-navigation.test.ts src\tools\stability-gate.test.ts`
  - Result: 3 files, 27 tests passed.

Full gates:

- `npm test`
  - Result: 71 files, 325 tests passed.
- `npm run test:perf-ui`
  - Result: 12 files, 64 tests passed.
- `npm run build`
  - Result: passed. Existing Vite large chunk warning remains.
- `$env:BASE_URL='http://127.0.0.1:4173/'; node artifacts\playwright-runner\099-reputation-crime-guard-smoke.mjs`
  - Result: passed.
  - Smoke coverage: initial guarded-town minimap risk, guard attention display, player-owned stealing block, event-zone risk on Old River Road, enemy stash snoop/steal without crime, protected town theft warning, witnessed theft crime event, criminal flag, trust/guard-attention changes, no debug UI leak, and performance budgets.
  - Smoke screenshot: `artifacts/playwright-runner/099-reputation-crime-guard-smoke.png`.
  - Smoke render stats: 334 draw calls, 400 meshes, 34 visible entities, 184 raycast candidates, 293 DOM nodes, 10.7ms estimated frame time.
  - Budget: 450 draw calls, 1200 meshes, 160 visible entities, 900 raycast candidates, 1800 DOM nodes, 16.7ms estimated frame time.

## Stack-Realistic Decisions

- Crime remains deterministic and local to the TypeScript simulation; no multiplayer theft, PvP flagging, or server authority layer was introduced.
- Event Zone is derived from active local danger events instead of hard-coding new map areas.
- Relationship trust is numeric and bounded, keeping it ready for merchants/guards/service NPCs without adding new dialogue trees now.
- Guard attention is shown as compact minimap/map text, not a new heavy HUD panel.
- Enemy stash theft reuses inventory, skill-use, chat, and floating-text systems instead of adding a separate rogue minigame.

## Not Done

- No stealing from players or player-owned containers.
- No bribery or black market implementation yet.
- No jail, bounty hunter, court, or long-term criminal career loop.
- No multiplayer PvP/PvP-crime rules.
- No full restricted-room navigation mesh or door-permission system; trespass is represented as a callable foundation hook.

## Risks / Follow-Up

- Trust numbers are first-pass tuning and need longer economy/service pacing checks before they gate prices or dialogue.
- Guard attention currently changes on detected crimes and does not yet have a nuanced decay curve.
- Event Zone is intentionally conservative and does not override guarded town/private plot safety.
- Trespass needs future content hooks once NPC private rooms are spatially implemented.
- Existing nonblocking Vite large chunk warning remains outside prompt 99.
