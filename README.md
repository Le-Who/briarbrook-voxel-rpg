# Briarbrook Voxel RPG

A browser-based voxel RPG vertical slice built with TypeScript, Vite, and Three.js.

Briarbrook is inspired by classic sandbox RPG verbs at a high level: town life, skills, inventory, banking, crafting, gathering, trading, housing, quests, and dungeon combat. It does not use copied names, maps, lore, UI assets, art packs, or external visual assets.

## Stack Specification

### Runtime And Package Baseline

- Browser-only single-page game. `index.html` mounts one WebGL canvas (`#game-canvas`) and one DOM UI root (`#ui-root`), then loads `src/main.ts` as the Vite module entrypoint.
- TypeScript-first codebase with `strict` compiler checks, ES2022 target, DOM typings, bundler-style module resolution, isolated modules, and no emitted JavaScript during the static check.
- Vite is the development server, production bundler, and preview host. `vite.config.ts` keeps React and Three.js vendor chunks explicit and leaves the remaining chunk warning visible.
- npm is the package manager surface. `package-lock.json` is lockfile version 3 and should be kept in sync with `package.json`.
- Runtime dependency footprint is intentionally small: Three.js, React, and React DOM are the production dependencies. TypeScript, Vite, Vitest, Playwright, and type packages are development dependencies.
- There is no React Three Fiber, Vue, Phaser, Redux, Tailwind, server framework, database client, or shipped backend service in the current runtime.

### Application Architecture

- `src/main.ts` creates the `Game` instance and exposes it as `window.briarbrookGame` for local debugging and smoke checks.
- `src/game/Game.ts` is the top-level coordinator. It wires `Simulation`, `Input`, `VoxelRenderer`, `UIManager`, `AudioManager`, `LoopGovernor`, `PerfMonitor`, save/load, and startup content validation.
- `src/game/Simulation.ts` is the authoritative local action dispatcher. DOM handlers and Three.js rendering should dispatch actions instead of mutating gameplay state directly.
- `src/game/GameState.ts` and `src/game/types.ts` define the serializable gameplay state and shared domain contracts.
- `src/systems/*` holds gameplay systems: combat, movement, inventory, crafting, economy, housing, quests, skills, magic, treasure, crime/reputation, companions, world density, feedback, telemetry, and transitions.
- `src/data/*` is the data registry layer for areas, items, skills, recipes, resources, spells, quests, economy, housing, professions, risk zones, treasure, combat encounters, tree resources, and visual prefabs.
- `src/net/*` contains multiplayer-readiness scaffolding: authoritative simulation, client input commands, event bus, local prediction, reconciliation hooks, protocol types, snapshot serialization, and the town-room sync spike. This is not a shipped network backend.

### Rendering, UI, And Assets

- Rendering is custom Three.js code under `src/render/*`. `VoxelRenderer`, `VoxelKit`, `Materials`, `RenderBudgets`, visual-reference plans, icon rendering, equipment visuals, and asset pipeline helpers live there.
- The visual style is procedural voxel-inspired runtime geometry. The current shipped game does not import a complete `.vox`, Blockbench, or external art-pack scene at runtime.
- Source art experiments and future pipeline material live under `assets/source/*`, with generated/exported placeholders under `assets/generated/*` and `assets/exported/*`.
- UI is migrating to React for player-facing HUD/windows under `src/ui/react/*`, mounted into `#ui-root` beside the single Three.js canvas. `UIManager` remains for transitional legacy surfaces, tooltip/minimap support, and direct regression contracts while React owns inventory, bank, hotbar, spellbook, crafting, journal, market, map, Profession Atlas, build mode, chat, help, and settings.
- `src/ui/WindowManager.ts`, `src/ui/react/windows/windowManagerV2.ts`, `DragPayload.ts`, layout presets, render guards, tooltip manager, minimap, and visual theme files own the movable/resizable window layer and UI performance budget contracts.
- `src/styles.css` is the global styling surface. There is no CSS preprocessor, CSS-in-JS runtime, or component library.
- Audio is local browser audio logic under `src/audio/*`, with settings, hooks, cue catalog coverage, and ambient update integration through `AudioManager`.

### Persistence, Tooling, And Validation

- Save/load is local browser persistence through `src/game/SaveLoad.ts`, backed by `localStorage` and a sanitized serializable `GameState`.
- `src/net/SnapshotSerializer.ts` covers snapshot round trips for multiplayer-readiness and production-tool checks, separate from the local save format.
- Content tooling lives under `src/tools/*` and `tools/content-validate.mjs`. It provides content registry export, validation, authoring previews, stability-gate checks, accessibility certification, production-tool checks, screenshot parity helpers, and next-pillar decision coverage.
- Tests are Vitest-based and colocated with the systems they protect (`*.test.ts` under `src/**`). The focused performance/UI gate is an explicit list in `npm run test:perf-ui`.
- The static quality gate is `npm run lint`, implemented as `tsc --noEmit`; ESLint is not configured in this repository.
- The production build gate is `npm run build`, implemented as `tsc && vite build`.
- `npm run build:health` is a convenience shortcut for `npm test && npm run build`; it does not replace the full playable-cut gate listed below.

## Current Build Status

The current branch contains the post-foundation scope gate, visual-reference implementation pass, gameplay-depth pillars, internal alpha release candidate gate, and next-pillar decision matrix. It is ready for focused internal alpha playtesting, not a broad external release.

Recent hardening includes:

- Post-foundation audit and Golden Path QA covering the first playable route.
- R1-R9 visual-reference targets implemented as interactive states: Briarbrook town hub, road combat, crypt combat, forest gathering, smithy, bank, housing build mode, Profession Atlas, and Adventure Map.
- CPU, render, DOM, tooltip, and visual-reference budget instrumentation with dev overlay counters.
- Loop governor throttling for active play, planning panels, pause/menu states, and background tabs, with a selectable active FPS cap.
- DOM rendering containment for inventory, chat, spellbook, skills, tooltips, and minimap.
- Stable tooltip lifecycle with viewport boundary clamping.
- First-class movable, resizable, collapsible chat panel.
- Compact minimap plus a separate expanded Map panel.
- Resizable inventory layout with fixed footer and centralized tooltip layer.
- Systemic harvestable and protected tree resources.
- Utility magery, treasure maps, secrets, traps, locks, and dungeon loot contracts.
- Real-time combat roles, encounter AI, target frames, and readable combat feedback.
- Local economy work orders, item sinks, vendor/service pricing, and balance telemetry.
- Housing workshop and homestead progression with storage, placement, and plot rules.
- Living world rumors/events, reputation/crime/safe-risk zone contracts, profession mastery goals, and companion-lite party surfaces.
- Multiplayer readiness decision documented as delayed until the solo loop is proven.
- Data-driven content validation, accessibility/localization/new-player certification, and internal alpha notes.
- Next pillar chosen: Treasure Hunting expansion, with economy, housing, and living world as supporting hooks.

See `POST_FOUNDATION_AUDIT.md`, `GOLDEN_PATH_QA.md`, `VISUAL_REFERENCE_IMPLEMENTATION_PLAN.md`, `REFERENCE_QA_MATRIX.md`, `VISUAL_BUDGET.md`, `PERF_UI_REGRESSION.md`, `PERFORMANCE_AUDIT.md`, `INTERNAL_ALPHA_NOTES.md`, and `NEXT_PILLAR_MATRIX.md` for the detailed cut notes and QA expectations.

## Run

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open the local Vite URL, usually `http://127.0.0.1:5173/`.

Production build:

```bash
npm run build
```

Production preview:

```bash
npm run build
npm run preview -- --host 127.0.0.1
```

## Verification

Before treating a cut as playable, run:

```bash
npm run lint
npm test
npm run test:perf-ui
npm run test:ui-smoke
npm run test:ui-visual
npm run test:ui-alpha
npm run content:validate
npm run build
```

`npm run lint` is the TypeScript static quality gate (`tsc --noEmit`). The project does not currently configure ESLint.

`npm run test:perf-ui` is the focused regression gate for performance and UI stability. It covers performance counters, loop governor behavior, frame-rate cap settings, DOM render containment, tooltip stability, chat modes, minimap/map behavior, movement modes, save/load persistence, tree harvestability, and Profession Atlas UI.

`npm run test:ui-smoke`, `npm run test:ui-visual`, and `npm run test:ui-alpha` are project-local Playwright gates for the React UI migration. They use the managed Vite server in `playwright.config.ts` and do not depend on the Codex in-app browser.

`npm run content:validate` validates content registries, ids, dead references, and representative spawn/test data. It currently passes with 0 warnings.

`npm run build` currently passes with the known Vite warning that the app entry chunk is over 500 kB after minification. That warning is accepted for the internal alpha branch and tracked in `docs/UI_BUNDLE_AUDIT.md`.

## Controls

- `WASD` / arrow keys: move in Keyboard Only or Keyboard + Mouse mode.
- Mouse click: select, attack, interact, and move only when Mouse Only or Keyboard + Mouse mode allows it.
- `E`: interact with the nearest usable object.
- `1`: attack.
- `2`: bow attack.
- `3`: Magic Arrow.
- `4`: health potion.
- `5`: mana potion.
- `6`: bandage.
- `7`: axe/world tree target.
- `8`: pickaxe/world mining target.
- `9`: Night Sight.
- `0`: utility action; opens pack or build flow depending on context.
- `[` / `]`: select previous or next hotbar slot.
- `C`: character panel.
- `K`: skills and Profession Atlas.
- `I`: inventory.
- `B`: bank panel.
- `H` or Build button: housing/build mode.
- Build mode: left click place, right click rotate, `Z`/`C` rotate, `X` cancel, `V` snap.

Movement Mode and camera-relative movement are configured from the Help panel. Keyboard Only is the default so accidental ground clicks do not move the player.

The Help panel also exposes the active gameplay FPS cap: 60 FPS by default, 120 FPS for high-refresh displays, or Custom from 30 to 240 FPS. This only changes active/combat render cadence; simulation remains fixed at 60 Hz and planning/pause/background modes keep their reduced cadences.

## Implemented Systems

- Serializable `GameState` owns player, entities, inventory, bank, skills, quests, chat, craft queue, build mode, projectiles, loot, resources, UI layout, movement/FPS-cap settings, performance counters, and placed buildings.
- `Simulation` is the action dispatcher; DOM and Three.js do not directly mutate gameplay state.
- Procedural voxel-style world rendering for Briarbrook, bank, smithy, forest, crypt, road encounter, and housing plot.
- Real item stacks, equipment, weight, consumables, banking, trade offers, and gold.
- Combat with target frame, melee, bow, magic, enemy AI, damage, death, XP, skill gain, and loot drops.
- Gathering with node depletion/respawn, protected town trees, tool requirements, skill gain, floating text, and inventory updates.
- Blacksmithing recipes with requirements, material consumption, crafting queue, and output items.
- Housing placement with grid ghost, rotation, plot validation, overlap checks, resource cost, storage, and localStorage save support.
- Quest and Journal flows driven by inventory, kills, pinned profession goals, and first-hour progress.
- Social town illusion through NPCs, simulated player names, and ambient local trade/chat.
- Window manager for draggable, resizable, hotbar-safe panels across inventory, spellbook, skills, journal, market, map, help, and chat.

## Internal QA Focus

Run a 45-60 minute human play session before any wider release. The automation covers the main contracts, but the exact current cut still needs manual pacing and stuck-state review.

Recommended manual smoke:

1. Start a fresh game in town and verify Keyboard Only mode blocks ground-click movement.
2. Switch to Mouse Only and Keyboard + Mouse, checking that each mode honors its movement contract.
3. Switch FPS cap between 60, 120, and Custom; confirm active/combat cadence changes while simulation cadence and menu throttling stay stable.
4. Resize inventory, hover edge slots, and confirm tooltip bounds.
5. Collapse and expand chat while messages arrive.
6. Switch minimap compact, standard, expanded, and hidden.
7. Open Skills -> Profession Atlas, search a node, select it, and pin it to Journal.
8. Open Adventure Map, toggle layers, and confirm compact minimap behavior remains readable.
9. Chop a forest tree and try a protected town tree.
10. Fight road bandits, crypt undead, and a target-frame enemy while checking damage/status readability.
11. Cast Detect Magic, Telekinesis, Unlock, Magic Lock, and Magic Trap against treasure/secret/container cases.
12. Complete one work order, repair or craft one item, and verify economy sink feedback.
13. Place housing objects, save, reload, and confirm placement/storage state survives.
14. Leave town/menu/help states idle with the dev overlay open and confirm reduced loop cadence.

## Current Limitations

- The current cut is an internal alpha release candidate, not an external release.
- Full 45-60 minute human alpha playtest has not been recorded for this exact cut.
- Movement is straight-line with collision, not full pathfinding.
- The voxel engine is procedural runtime geometry, not an imported `.vox` or Blockbench asset pipeline.
- Trade partner inventories are lightweight simulated snapshots, not persistent NPC economy ledgers.
- Main JS chunk is still over the default Vite warning threshold.
- Browser console can show the expected low-severity AudioContext autoplay warning before the first user gesture.
- No shipped multiplayer, server backend, second region, pets/taming, or full asset authoring pipeline yet.
