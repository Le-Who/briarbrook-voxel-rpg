# Internal Build Notes

Date: 2026-05-19

Decision: ship the next internal build for focused playtesting, not external release. The build is materially clearer and cheaper to run after the performance/UI pass, but it still needs a real 45-60 minute human play session before any wider test.

Review method for this cut:

- Automated gate: `npm run test:perf-ui` passed, 12 files / 59 tests.
- Production build: `npm run build` passed with the known large chunk warning.
- Browser smoke: verified keyboard-only default, compact minimap, collapsed/expanded chat, resizable inventory layout, Profession Atlas node families, tree resource counts/protected trees, and movement mode save persistence.
- Full 45 minute manual play was not performed in this automated pass. Treat that as the next internal QA activity, not as completed.

## Major Fixes In This Cut

- Added CPU/performance instrumentation, render budgets, loop governor modes, and dev overlay counters for frame time, UI updates, tooltip activity, minimap cadence, and loop state.
- Reduced idle/menu work with loop governor modes for active gameplay, planning panels, pause, and background tabs.
- Hardened DOM rendering for inventory, chat, spellbook, skills, tooltips, and minimap.
- Reworked tooltip lifecycle to avoid remount/flicker from unrelated world updates and clamp tooltip bounds inside the viewport.
- Made chat a first-class movable/resizable/collapsible panel with compact virtualization.
- Split compact minimap from the expanded Map panel and moved route/layer detail into the map panel.
- Made inventory resizable with an internal grid body, fixed footer, and centralized tooltip layer.
- Converted visual tree coverage into systemic harvestable/protected resource entities with ResourceMap sync.
- Added explicit movement modes: Keyboard Only default, Mouse Only, Keyboard + Mouse, with persistence.
- Redesigned Profession Atlas as a usable relationship map with lenses, pan/zoom/search, node details, implemented/future status, and Journal pinning.
- Added `PERF_UI_REGRESSION.md` and `npm run test:perf-ui` as the focused performance/UI regression gate.

## Visible System Classification

| System | Classification | Ship decision |
| --- | --- | --- |
| First-hour town onboarding | Stable enough for player | Ship. Keep guide and Journal focused on first route. |
| Movement modes | Stable enough for player | Ship. Keyboard Only remains default. |
| Inventory | Stable enough for player | Ship. Watch small viewport resize during manual QA. |
| Tooltips | Stable enough for player | Ship. Remount threshold is now guarded. |
| Chat | Stable enough for player | Ship. Collapsed/compact/expanded modes are useful. |
| Minimap and Map panel | Stable enough for player | Ship compact minimap and expanded map split. |
| Tree harvesting | Stable enough for player | Ship. Protected town trees and harvestable forest trees are explicit. |
| Profession Atlas | Stable enough for internal player | Ship for internal build. Continue polish after player feedback. |
| Combat, casting, gathering | Needs polish | Ship for internal testing; focus on feedback clarity and no stuck/action lock. |
| Crafting, market, work orders | Needs polish | Ship, but keep expectations modest. |
| Housing | Needs polish | Ship as early persistence loop, not as a full building game. |
| Crypt and treasure secrets | Needs polish | Ship with caution; keep as exploratory content. |
| Dev overlay and dev travel | Dev-only | Keep hidden from normal play unless dev overlay is enabled. |
| Animal taming/pets | Hide until later | Keep Atlas labels as future/unimplemented only. |
| New magic schools | Hide until later | Do not expand for this build. |
| Multiplayer/PvP | Cut from this build | Explicit non-goal. |
| Second city / large new dungeon | Cut from this build | Explicit non-goal. |

## Must-Ship Criteria Status

| Criteria | Status | Evidence |
| --- | --- | --- |
| No high CPU in idle/menu | Pass for internal | Loop governor tests and dev overlay counters are in place. Manual 45-60 minute run still required. |
| Stable tooltips | Pass | `TooltipManager` stability tests and inventory tooltip contract pass. |
| Usable inventory | Pass | Resizable-grid layout, footer containment, tooltip boundary smoke. |
| Movable/collapsible chat | Pass | Chat panel tests cover expanded/compact/collapsed modes and virtualization. |
| Compact minimap | Pass | Map/minimap tests and browser smoke verify compact mode. |
| Movement mode setting | Pass | Default keyboard, all modes, and save/load persistence are tested. |
| Obvious tree harvest behavior | Pass | Tree harvestability tests cover harvest/protected/sync behavior. |
| Usable Profession Atlas | Pass for internal | Three-pane Atlas, search, node detail, node pinning, and all node families verified. |
| No major stuck/action lock | Pass for covered paths | Transition, movement, approach, and resource tests pass; still needs long play session. |

## Controls and UI Changes

- Movement Mode is in Help settings:
  - Keyboard Only: WASD/arrows move; ground click movement is disabled; E/click target interacts.
  - Mouse Only: ground click moves; WASD movement is ignored.
  - Keyboard + Mouse: both work; WASD cancels click path.
- Help text now reflects the active movement mode.
- Camera-relative movement can be toggled from Help.
- Chat can be expanded, compact, collapsed, or hidden during combat.
- Minimap can be compact, standard, expanded, or hidden. Expanded mode opens the Map panel.
- Inventory can be resized; item details stay in-panel and tooltips use the global tooltip layer.
- Profession Atlas has lens buttons, search, zoom out, Fit, Reset, zoom in, node selection, node detail actions, and Pin Goal.

## How To Test This Build

Automated:

```bash
npm run test:perf-ui
npm run build
```

Manual internal smoke:

1. Start a fresh game in town.
2. Confirm movement mode is Keyboard Only and ground clicks do not move the player.
3. Switch to Mouse Only, click ground to move, confirm WASD does not move.
4. Switch to Keyboard + Mouse, click a path, then press WASD and confirm the click path cancels.
5. Open inventory, resize it, hover edge slots, and confirm tooltip bounds.
6. Collapse and expand chat, add/receive messages, and confirm scroll position does not jump while scrolled up.
7. Switch minimap compact, standard, expanded, hidden.
8. Open Skills -> Profession Atlas, search `map`, select Lockpicking, pin it, and confirm Journal updates.
9. Try chopping a forest tree and a town tree. Forest should harvest; town should deny as protected.
10. Fight a road enemy, cast Magic Arrow or Heal, gather a resource, save, reload, and confirm no stuck action.
11. Open all major windows at a small viewport and verify they remain reachable above the hotbar.
12. Leave the game idle in town and with Help/pause open; dev overlay should show reduced planning/pause cadence.

## Known Issues

| Issue | Severity | Workaround / decision |
| --- | --- | --- |
| Main JS chunk is still over 500 kB after minification. | Low | Accepted for internal build; revisit code splitting later. |
| `tool:torch` content warning reports missing MagicaVoxel source path. | Low | Runtime fallback works; fix source metadata in asset pass. |
| Browser AudioContext warning appears before user gesture. | Low | Expected browser policy; audio resumes after interaction. |
| Missing favicon can produce a 404 in browser smoke. | Low | Cosmetic; add favicon during release polish. |
| 45-60 minute human play session not yet recorded for this exact cut. | Medium | Required before external release; not blocking internal build. |
| Crypt/treasure pacing still needs human feedback. | Medium | Keep in internal build, but do not broaden dungeon scope yet. |

## Intentionally Hidden Or Postponed

- Second city.
- Multiplayer.
- Full PvP.
- Pets and animal taming loops.
- New schools of magic.
- Large new dungeon.
- More skills that do not directly improve first-hour clarity.
- Dev travel and dev overlay for normal players.

## Internal Build Recommendation

Ship this as an internal build for focused QA on the first-hour loop, CPU/menu behavior, UI stability, movement modes, tree harvesting, and Profession Atlas comprehension.

Do not add new content breadth before the next pass. The next work should be either blocker fixes from the 45-60 minute play session or small clarity/polish changes to existing systems.
