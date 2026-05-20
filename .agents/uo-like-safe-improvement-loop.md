## 2026-05-20 - Asset file guards in tests
**Learning:** TypeScript tests in this repo should prefer Vite `?raw` imports for repo files and static assets instead of Node built-in `fs` imports, because `tsconfig.json` does not include Node types.
**Evidence:** `npm run lint` failed on `node:fs` in `src/tools/production-tools.test.ts`; the same guard passed after switching to `../../index.html?raw` and `../../public/favicon.svg?raw`.
**Action:** For future docs, HTML, or static asset guard tests, match the existing `?raw` import pattern unless the project explicitly adds Node typings.

## 2026-05-20 - React inventory hit-test containment
**Learning:** A React slot can be locator-visible but still fail real drag proof if overflowing panel children or footers cover its center; assert `document.elementFromPoint` on drag source and target before mouse movement.
**Evidence:** The Playwright UI smoke initially missed the React inventory item center because the inventory footer overflowed upward at 1366px; after constraining game-window children and compact inventory/bank footers, `npm run test:ui-smoke` passed at 1366x768 and 1600x900.
**Action:** Keep browser drag checks tied to hit-testable centers, not visibility alone, and preserve `min-width: 0` containment on React window body/header/footer children.

## 2026-05-20 - Vite app chunk split boundaries
**Learning:** Broad manual chunks across `game-core`, `game-render`, `game-ui`, React UI, and tools can remove the large-chunk warning while introducing Rollup circular-chunk warnings; that is not a clean optimization.
**Evidence:** A trial build emitted circular chunk warnings such as `game-render -> game-core -> game-render` and `game-core -> game-ui -> game-core`; narrowing to vendor splits and dynamic dev-only imports kept the build warning scope honest.
**Action:** Prefer acyclic vendor chunks, route/workspace dynamic imports, or dev-only lazy imports before adding manual chunks across mutually dependent gameplay, renderer, and UI modules.

## 2026-05-20 - React hotbar browser smoke selectors
**Learning:** Older artifact smoke scripts can still assert removed legacy selectors such as `.hotbar`; maintained browser proof should use `[data-ui-hotbar]` or `[data-react-panel="hotbar"]` after the React HUD migration.
**Evidence:** `node artifacts/playwright-runner/111-briarbrook-town-smoke.mjs` failed on `desktop: .hotbar is not visible`, while `npm run test:ui-smoke` and direct Playwright checks passed against the React hotbar selectors.
**Action:** Treat stale artifact selector failures as a script-refresh signal, then verify current runtime behavior with maintained Playwright tests or updated React selectors.

## 2026-05-20 - Runtime dynamic-light budget plans
**Learning:** Runtime point-light plans should be exported and covered by render-budget tests, not kept as an untested local table inside `VoxelRenderer.applyLighting()`.
**Evidence:** A failing `npm test -- src/render/art-direction.test.ts` red step exposed the missing runtime-checkable light plan; after exporting `runtimeDynamicLightPlans`, the focused render test, `npm run test:perf-ui`, direct R1 Playwright stats (`dynamicPointLights=3`), and `npm run build` passed.
**Action:** Add or move future area point lights through `runtimeDynamicLightPlans` and keep each area at or below `assetPerformanceBudget.maxDynamicLights` unless an explicit visual-budget update approves the change.

## 2026-05-20 - Primary mesh raycast candidates
**Learning:** Entity raycast budgets should count bounded primary pick meshes per visible entity, not every decorative child mesh in a voxel model.
**Evidence:** A failing `npm test -- src/render/art-direction.test.ts` red step added `selectPrimaryPickTargetIndexes`; after `VoxelRenderer.pickEntity()` used marked primary meshes, direct Playwright probes kept R1 portal, R2 bandit, and R3 skeleton picks working while R1-R9 raycast candidates fell to 63/33/25/88/5/5/15/63/120.
**Action:** When adding new entity visual detail, keep the main body or interaction affordance among the largest pick meshes, and use browser pick probes for combat/service targets before claiming raycast candidate wins.

## 2026-05-20 - Stable material cache keys
**Learning:** `MaterialLibrary` cache keys should canonicalize material option objects so equivalent Three.js material parameters reuse one material even when property insertion order differs.
**Evidence:** A failing `npm test -- src/render/art-direction.test.ts` red step showed two equivalent emissive/transparent option objects creating separate `MeshStandardMaterial` instances; after stable option-key serialization, the focused render test passed.
**Action:** Keep shared material calls on `MaterialLibrary.get()` and add a focused cache-key test when new option shapes are introduced.
