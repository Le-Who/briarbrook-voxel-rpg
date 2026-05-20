## 2026-05-20 - Asset file guards in tests
**Learning:** TypeScript tests in this repo should prefer Vite `?raw` imports for repo files and static assets instead of Node built-in `fs` imports, because `tsconfig.json` does not include Node types.
**Evidence:** `npm run lint` failed on `node:fs` in `src/tools/production-tools.test.ts`; the same guard passed after switching to `../../index.html?raw` and `../../public/favicon.svg?raw`.
**Action:** For future docs, HTML, or static asset guard tests, match the existing `?raw` import pattern unless the project explicitly adds Node typings.

## 2026-05-20 - React inventory hit-test containment
**Learning:** A React slot can be locator-visible but still fail real drag proof if overflowing panel children or footers cover its center; assert `document.elementFromPoint` on drag source and target before mouse movement.
**Evidence:** The Playwright UI smoke initially missed the React inventory item center because the inventory footer overflowed upward at 1366px; after constraining game-window children and compact inventory/bank footers, `npm run test:ui-smoke` passed at 1366x768 and 1600x900.
**Action:** Keep browser drag checks tied to hit-testable centers, not visibility alone, and preserve `min-width: 0` containment on React window body/header/footer children.
