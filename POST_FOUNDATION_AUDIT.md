# Post Foundation Audit

Date: 2026-05-19
Prompt: 91-post-foundation-audit-and-scope-gate
Build scope: prompts 1-90 foundation, before release-director and new depth work.

## Recommendation

Recommendation: proceed to prompt 92 and visual/reference implementation planning, but keep gameplay-depth prompts 93+ gated until a real 60-minute wall-clock session or approved soak equivalent is recorded on the current candidate.

The foundation is functionally usable for the current slice: movement modes, inventory/equipment visibility, map/minimap, Profession Atlas, bank, crafting, spell casting, gathering, combat, save/load, and dev-control hiding all have fresh automated or browser evidence. The external release gate is still not green because the final 60-minute crash-free player session is not recorded.

## Evidence

Commands run:

- `npm test`: passed, 64 files / 264 tests.
- `npm run test:perf-ui`: passed, 12 files / 59 tests.
- `npm test -- src/tools/stability-gate.test.ts src/game/golden-path.test.ts src/game/release-candidate-gate.test.ts`: passed, 3 files / 12 tests.
- `npm run build`: passed with the existing Vite large chunk warning.
- Browser smoke at `http://127.0.0.1:5173/`: fresh save, 1366x768, no F9/dev overlay, normal gameplay actions only. Screenshot captured at `artifacts/playwright/91-post-foundation-smoke.png`.

Browser smoke highlights:

- Fresh save loaded in `town`, level 1, dev overlay off.
- Keyboard movement and click movement both changed player position after switching movement modes.
- UI reset kept core windows reachable with inventory, character, spellbook, skills, journal, market, and map open.
- Inventory and equipment state were visible: iron sword, leather armor, backpack, cracked shield, and 17+ inventory items.
- Profession Atlas rendered as a relationship map with profession lenses, graph nodes, edge details, and node detail panel.
- Hotbar slot 4 was assigned to Heal through the runtime hotbar action path and persisted through save/reload.
- Heal casting consumed mana and generated a Magery skill event. The observed cast fizzled, which is valid gameplay feedback rather than a failure.
- Bank opened in Briarbrook Bank with bank and inventory panels visible.
- Smithy opened crafting with forge station selected.
- Repeated normal attempts produced tree and ore yields: Logs `0 -> 7`, Iron Ore `0 -> 5`, plus Stone Block.
- Road combat dealt melee and spell damage to a bandit: HP `56 -> 16`, damage telemetry `melee: 23`, `spell: 17`.
- Save/reload preserved area `road`, hotbar slot 4 Heal, inventory contents, and dev overlay stayed off.

Console findings:

- Content validation is currently clean with 0 warnings.
- Expected browser autoplay warning for AudioContext before user gesture.
- Favicon is linked through `public/favicon.svg`; no favicon 404 is expected.

## Scope Gate

| Gate | Status | Evidence / Notes |
| --- | --- | --- |
| No critical stuck bugs | PASS | Stability gate, transition tests, browser route smoke, and save/reload pass. |
| CPU acceptable in idle/menu | RISK | Perf tests pass. Browser active road sample recovered to 36 FPS / 27.7 ms with 1214 draw calls and 845 DOM nodes, but a many-window UI state sampled 16 FPS / 62.4 ms and 1899 draw calls. Needs a dedicated idle/menu sample before external release. |
| Tooltips stable | PASS | `src/ui/TooltipManager.test.ts` and `npm run test:perf-ui` passed. |
| Inventory/chat/minimap usable | PASS | Browser snapshot and smoke confirmed inventory, chat, expanded map/minimap, and panel reset. |
| Movement modes work | PASS | Keyboard movement and click movement moved the player after mode changes. |
| Player can cast | PASS | Heal consumed mana and produced valid fizzle feedback; spellbook and hotbar assignment path are covered by tests. |
| Player can gather | PASS | Repeated normal attempts yielded logs and ore. |
| First-hour path not blocked | PASS WITH RELEASE HOLD | Golden-path tests pass and browser smoke covers core verbs. The literal 60-minute final session is still not recorded. |
| Normal mode has no debug buttons | PASS | Dev overlay and dev travel were false during smoke; known dev tools remain behind F9/dev overlay. |
| Save/load stable | PASS | Tests passed and browser reload preserved road area and hotbar assignment. |

## System Classification

| System | Classification | Notes |
| --- | --- | --- |
| Movement/input | Production-ready for slice | Keyboard and click movement modes are implemented and tested. |
| Camera | Usable but needs polish | Camera smoothing controls exist; no fresh multi-viewport camera read was done in this audit. |
| UI windows | Usable but needs polish | Managed windows work, but many-window overlap can block spellbook clicks until focus/close recovery. |
| Tooltips | Production-ready for slice | Tooltip guard tests pass. |
| Chat | Usable but needs polish | Chat is readable and windowed; ambient spam can add visual noise. |
| Minimap/map | Production-ready for slice | Standard and expanded map modes are usable with layers and waypoint context. |
| Inventory/equipment | Production-ready for slice | Equipment, item state badges, weight, and inventory are visible. |
| Paperdoll/gear visuals | Usable but needs polish | Gear state is visible in Character and inventory; visual fidelity can improve in reference passes. |
| Hotbar | Usable but needs polish | Assignment and persistence work; UI assignment can be obscured by overlapped windows. |
| Skills/ledger/atlas/mastery | Production-ready for slice | Profession Atlas is a relationship map, not a passive tree. |
| Spellbook | Production-ready for slice | Known/unknown filters, castability, reagents, assignment, and casting feedback exist. |
| Combat | Production-ready for slice | Road bandit smoke dealt melee/spell damage and telemetry recorded it. |
| Gathering/resources | Production-ready for slice | Tree and ore yields work after normal success rolls; protected/depleted states are tested. |
| Crafting/repair | Usable but needs polish | Forge/crafting station opens correctly; deeper recipe completion was not re-run in browser smoke. |
| Economy/work orders | Usable but needs polish | Market/work-order UI exists and tests pass; first-hour reward tuning remains a depth/balance risk. |
| Housing | Usable but needs polish | Starter plot/build mode is implemented and stability harness covers persistence; no fresh browser placement was done in this audit. |
| Journal/codex | Usable but needs polish | Journal opens and supports objective/skill context; still benefits from route clarity pass. |
| Save/load | Production-ready for slice | Automated regression and browser reload passed. |
| Performance | Usable but needs polish | Automated budgets pass, but dense UI/browser active samples show risk before public release. |

## Top 10 Blockers And Gate Risks

1. P0: Final 60-minute crash-free wall-clock session is not recorded for the current candidate.
2. P1: Many-window layout can leave a foreground window intercepting intended clicks on another panel, observed with Market over Spellbook.
3. P1: Browser active sample in a dense panel state showed low FPS and high frame time; needs clean idle/menu/active profiling before public release.
4. P1: Hotbar assignment is functionally covered, but browser UI assignment should be retested after window layering cleanup.
5. P2: Literal first-hour play was not run for 60 real minutes in this audit; evidence is automated plus accelerated browser smoke.
6. P2: Vite emits the known over-500 kB main chunk warning.
7. Resolved: `tool:torch` source metadata now matches its procedural-only runtime fallback.
8. Resolved: favicon is linked through `public/favicon.svg`, removing the browser 404 from QA noise.
9. P3: AudioContext autoplay warning appears before user gesture; expected, but release notes should call it out if audio QA sees silence before input.
10. P3: Ambient chat/social lines add density and may obscure first-step clarity in long sessions.

## Top 10 High-Value Improvements

1. Record the 60-minute wall-clock session or formal soak equivalent and attach the result to release docs.
2. Add a browser smoke that exercises hotbar assignment through real DOM drag/click after closing or focusing panels.
3. Add a dedicated idle/menu perf sample table for town idle, help/menu open, and many-window layout.
4. Improve managed-window focus affordances so a player can recover from overlapping panels without guessing.
5. Add one first-hour route checklist row for actual browser crafting completion, not only crafting-panel visibility.
6. Add one browser housing placement check after the plot ferry route.
7. Add route-copy polish for failed gather/cast rolls so players understand normal failure versus blocked action.
8. Keep the linked favicon path stable so browser smoke stays free of favicon 404 noise.
9. Keep future authored torch source work on a real `.vox` path before changing the prefab source tool back to MagicaVoxel.
10. Keep visual reference work focused on readability, batching, and HUD hierarchy rather than adding more systems.

## Top 10 Things To Hide Or Cut

1. Keep all teleport, spawn, grant, resource reset, quest completion, and raw telemetry export controls behind dev overlay only.
2. Keep market quick access hidden until economy context or unlock warrants it.
3. Keep build mode hidden outside housing and plot context.
4. Keep future-only skills labeled as future/support, not active progression promises.
5. Keep unknown spell collection secondary to known usable spells in default spellbook.
6. Hide raw coordinates from normal player-facing flow except compact map/location context.
7. Avoid persistent resource labels in normal view; use hover/tool/gather feedback.
8. Avoid exposing multiplayer, pets/taming, ships, auction house, and full crime UI in this phase.
9. Avoid extra debug or screenshot-only controls during reference visual implementation.
10. Avoid opening too many panels by default; first screen should stay guide, status, hotbar, chat, minimap, and essential quick buttons.

## Non-Goals Confirmed

No new regions, classes, spell circles, auction house, multiplayer gameplay, pets/taming, ships/boats, or full crime system were added during this audit.

## What Was Not Done

- A literal 60-minute wall-clock player session was not completed in this pass.
- No code fixes were made for the window-overlap or performance risks in prompt 91.
- No new gameplay depth was added.

## Prompt 91 Acceptance

Acceptance status: PARTIAL PASS / FIX-FIRST GATE FOR 93+.

The team has enough current evidence to know the build is broadly usable and to proceed into prompt 92's release-director pass. The team should not start gameplay-depth prompts 93+ until the 60-minute session gap is closed and the many-window hotbar/spellbook interaction risk is either fixed or explicitly accepted as non-blocking.
