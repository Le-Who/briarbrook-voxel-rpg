# UI Bundle Audit

Prompt 131 status: accepted for the React UI alpha path, with the remaining Vite warning documented as a broader game bundle issue rather than a React workspace issue.

Prompt 132 status: accepted for internal alpha with the remaining warning classified as an acceptable known issue.

Prompt 133 status: Three.js vendor output is split below the default Vite warning threshold. The remaining warning is the app entry chunk.

Prompt 134 status: screenshot parity preset metadata stays available to the dev overlay, while the heavier preset mutator now loads as a lazy dev chunk when a screenshot parity action is invoked.

Prompt 135 status: runtime content validation remains active but loads the registry and validation modules through lazy startup diagnostics instead of the app entry path.

Prompt 136 status: Dev overlay diagnostics and React-owned legacy panel modules are no longer in the normal `UIManager` startup path. The remaining warning is the app entry chunk.

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
- Game-loop DOM/window/icon diagnostics now refresh at a 1 second cadence instead of querying the DOM on every scheduled tick.
- Screenshot parity application/clear logic is loaded on demand by the queued dev actions; the overlay keeps only the small preset metadata in the startup path.
- Startup content validation remains active through `validateRuntimeContent`, with registry and validator modules loaded as lazy diagnostic chunks.
- Dev overlay diagnostics load on first overlay use instead of through the normal HUD startup path.
- `UIManager` no longer statically imports legacy panel modules for React-owned panels such as inventory, bank, hotbar, spellbook, crafting, journal, market, map, skills, build, chat, and help.

## Warning Status

The Vite warning is reduced but not eliminated. The remaining oversized chunk is:

- `index-Cnhbo3Qi.js` at 778.22 kB minified / 221.19 kB gzip, mostly core gameplay/data/UI integration code.

The Three.js vendor output is now below the threshold:

- `three-core-CFK7APYo.js` at 167.39 kB minified.
- `three-vendor-D7JRZpM9.js` at 339.90 kB minified.

Additional lazy dev chunks:

- `screenshotParityPresets-BHt6vKIA.js` at 1.95 kB minified / 0.84 kB gzip.
- `screenshotParity-DEO-jhjS.js` at 9.78 kB minified / 3.37 kB gzip.
- `DevOverlay-DTaaZFeQ.js` at 26.56 kB minified / 7.82 kB gzip.

Additional lazy content-validation chunks:

- `ContentRegistry-CIoFrPPL.js` at 6.56 kB minified / 1.58 kB gzip.
- `ContentValidation-BF9fxRVf.js` at 22.12 kB minified / 5.56 kB gzip.

Next action: split large static game data and renderer-adjacent systems by route/area or dynamic ownership boundaries without introducing circular Rollup chunks.

## Acceptance

- Initial gameplay bundle impact is documented.
- React vendor, Three core, and Three vendor chunks are visible in build output.
- Profession Atlas / Adventure Map and Knowledge panels are dynamically imported.
- Heavy UI workspaces are not part of the initial app entry chunk.
- React root shell avoids frame/clock-driven rerenders.
- React render metrics are visible through the existing perf monitor path.
- `npm run build` passes with the remaining warning documented above.
