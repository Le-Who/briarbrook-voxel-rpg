# UI and Render Performance Budget

This budget keeps the browser RPG responsive while panels, icons, VFX, equipment visuals, and dense voxel props grow.

## Runtime Metrics

The dev overlay reports FPS, frame time, draw calls, triangles, mesh counts, instancing counts, material and geometry counts, raycast candidates, heap estimate, UI DOM nodes, visible windows, cached icon count, icon render requests, tooltip remounts, and the practical event-listener estimate.

## Budgets

- Normal play draw calls: 450 target.
- Estimated frame time: 16.7 ms target.
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
