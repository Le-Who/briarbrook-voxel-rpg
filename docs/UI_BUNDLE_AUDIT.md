# UI Bundle Audit

Prompt 131 status: accepted for the React UI alpha path, with the remaining Vite warning documented as a broader game bundle issue rather than a React workspace issue.

Prompt 132 status: accepted for internal alpha with the remaining warning classified as an acceptable known issue.

## Scope

- Browser-only Vite + TypeScript + Three.js.
- No React Three Fiber.
- No Redux, Tailwind, React Flow, or large component library.
- Three.js remains the world renderer. React owns DOM HUD/windows only.

## Baseline Before Prompt 131

Fresh build before code splitting:

```text
dist/assets/index-B_1C2dfU.css  108.32 kB | gzip 22.48 kB
dist/assets/index-DM2j5kPb.js  1,669.44 kB | gzip 464.48 kB
```

The single JS entry chunk exceeded Vite's 500 kB warning threshold and bundled game code, Three.js, React, and migrated UI workspaces together.

## Build After Prompt 131

Fresh build after `vite.config.ts`, manual vendor chunks, and lazy workspace imports:

```text
dist/assets/index-B_1C2dfU.css                   108.32 kB | gzip 22.48 kB
dist/assets/PlanningWorkspaces-DdznK4s2.js        14.09 kB | gzip  4.67 kB
dist/assets/KnowledgePanelsSurfaces-BrF0Ap4j.js   15.83 kB | gzip  4.85 kB
dist/assets/react-vendor-DYavi4jC.js             192.35 kB | gzip 60.28 kB
dist/assets/three-vendor-NbT07Q_C.js             503.69 kB | gzip 129.62 kB
dist/assets/index-CD-GMfYw.js                    941.78 kB | gzip 265.46 kB
```

Initial static JS is now split into the app entry, React vendor, and Three vendor chunks. Profession Atlas / Adventure Map and Spellbook / Crafting / Market / Journal load only when those workspaces or panels are opened.

## Dependency Budget

- Added React and React DOM only for DOM UI.
- Added project-local Playwright for deterministic browser acceptance gates.
- Did not add `@xyflow/react`; Profession Atlas uses pathway cards to avoid graph dependency cost and layout risk.
- Did not add Tailwind, Redux, shadcn, or a component library.

## Runtime Performance Notes

- `App` no longer subscribes to the full UI snapshot or clock just to render the shell.
- Escape handling reads `bridge.getSnapshot()` only when Escape is pressed.
- Root shell state uses primitive selectors for planning/build/knowledge visibility.
- React render counts are sampled through `consumeReactRenderCounts()` and flow into `PerfMonitor.windowRenderPerSecond` with `react:*` panel ids.
- Existing performance surfaces continue to track FPS, frame time, subsystem timings, tooltip mount/update counts, window render counts, DOM node count, visible window count, and Loop Governor cadence.
- `UIManager.getPerformanceStats()` now counts React windows marked with `data-ui-window="true"` in the visible window budget.

## Warning Status

The Vite warning is reduced but not eliminated. The remaining oversized chunks are:

- `index-CD-GMfYw.js` at 941.78 kB minified, mostly core gameplay/data/UI integration code.
- `three-vendor-NbT07Q_C.js` at 503.69 kB minified, just over the default warning threshold.

Next action, outside prompt 131 unless requested: split large static game data and renderer-adjacent systems by route/area, then evaluate whether Three.js can stay as one vendor chunk with a documented threshold or needs a dedicated warning limit.

## Acceptance

- Initial gameplay bundle impact is documented.
- React vendor and Three vendor chunks are visible in build output.
- Profession Atlas / Adventure Map and Knowledge panels are dynamically imported.
- Heavy UI workspaces are not part of the initial app entry chunk.
- React root shell avoids frame/clock-driven rerenders.
- React render metrics are visible through the existing perf monitor path.
- `npm run build` passes with the remaining warning documented above.
