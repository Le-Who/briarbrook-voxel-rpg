# UI and Render Performance Budget

This budget keeps the browser RPG responsive while panels, icons, VFX, equipment visuals, and dense voxel props grow.

Last updated: 2026-05-20.

## Runtime Metrics

The dev overlay reports FPS, frame time, draw calls, triangles, mesh counts, instancing counts, material and geometry counts, raycast candidates, heap estimate, UI DOM nodes, visible windows, cached icon count, icon render requests, tooltip remounts, loop-governor state, minimap/update counters, and the practical event-listener estimate.

The visual-reference pass adds screenshot-parity budget captures for R1-R9 in `VISUAL_BUDGET.md`. Those captures are the practical budget ledger for town, road, crypt, forest, smithy, bank, housing build mode, Profession Atlas, and Adventure Map states.

## Budgets

- Normal play draw calls: 450 target.
- Estimated frame time: 16.7 ms target at the default 60 FPS cap.
- Active gameplay FPS cap: default 60, optional 120, or Custom from 30 to 240. The selected cap affects active/combat render cadence only; simulation remains fixed at 60 Hz.
- Meshes: 1200 total, with repeated static objects expected to move toward batching or instancing.
- Triangles: 140000 target.
- Raycast candidates: 900 target.
- UI DOM nodes: 1800 target with inventory, spellbook, journal, and help open.
- Visible managed windows: 8 target.
- Cached icons: 260 target; icon source size remains 64x64 SVG/viewBox unless a later atlas replaces it.
- Unique equipment models in current-area memory: 24 target.
- VFX/particle budget: 90 active particles/effect elements.
- Dynamic lights: 3 target.
- Post-transition heap estimate: 180 MB target when available.

## Rules

- Do not rebuild HUD HTML during active pointer drag, window drag, hotbar drag, text edit, or scroll-settle windows.
- Keep long panels searchable and sectioned; virtualize only when a real list exceeds the DOM budget.
- Cache icon markup and keep tooltip content deterministic by item/spell/skill id.
- Prefer shared materials/geometries, procedural prefab reuse, and InstancedMesh for repeated props.
- Treat budget failures as investigation triggers, not automatic feature cuts.
- Keep normal-mode debug controls out of the HUD; reference capture helpers must stay behind dev-only paths.
- User-selected FPS caps must not bypass reduced planning, pause, loading, or background cadences.
- New treasure, economy, housing, and living-world visual hooks must reuse existing budget counters rather than adding untracked DOM or mesh families.
- Any scene-density pass that raises draw calls, meshes, DOM nodes, raycast candidates, or estimated frame time must update `VISUAL_BUDGET.md` or the relevant QA document with before/after stats.

## Current Verification Gate

Run before publishing internal alpha changes:

```bash
npm run lint
npm test
npm run test:perf-ui
npm run content:validate
npm run build
```

Current accepted non-blockers:

- Main Vite JavaScript chunk remains over the default 500 kB warning threshold.
