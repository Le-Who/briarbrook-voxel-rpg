# Internal Alpha Release Candidate QA

Prompt: 107-internal-alpha-release-candidate
Date: 2026-05-20

## Scope

- Updated the release candidate gate to target an internal alpha for 5-20 testers.
- Added required internal-alpha gates for scope, CPU/performance, tooltip stability, movement-mode persistence, Profession Atlas usability, and telemetry-summary readiness.
- Created `INTERNAL_ALPHA_NOTES.md` with included scope, excluded scope, known issues, controls, test flow, bug report template, save export instructions, questionnaire, and telemetry summary.
- Kept the build positioned as controlled internal testing, not public marketing.

## Acceptance Criteria

- The release scope is frozen to one region and the first 60-minute golden path plus MVP systems.
- Build requirements are represented as explicit gates:
  - no movement lock;
  - no common portal stuck bug;
  - CPU/performance acceptable;
  - no tooltip flicker;
  - save/load stable;
  - UI reset works;
  - movement modes persist;
  - inventory/equipment clear;
  - Profession Atlas usable;
  - first hour completable.
- Feedback collection is documented through a bug report template, save export instructions, questionnaire, telemetry summary, and known issues.

## Verification

- RED: `npm test -- src\game\release-candidate-gate.test.ts` failed on missing internal-alpha gates, old notes target, and missing `INTERNAL_ALPHA_NOTES.md`.
- GREEN focused: `npm test -- src\game\release-candidate-gate.test.ts` passed, 1 file / 5 tests.
- Related focused: `npm test -- src\game\release-candidate-gate.test.ts src\tools\stability-gate.test.ts src\game\transition-stability.test.ts src\game\save-load.test.ts src\ui\TooltipManager.test.ts src\ui\profession-ui.test.ts src\game\golden-path.test.ts src\ui\performance-budget.test.ts` passed, 8 files / 37 tests.

## Done

- Release gate and notes now match prompt 107.
- Internal alpha notes are available at the repo root.
- No second region, multiplayer gameplay, PvP/crime expansion, pets/taming, auction house, boats, or spell expansion were added.

## Not Done

- No new browser screenshot run was added specifically for this prompt.
- No commit or package artifact was produced because this prompt only required release candidate preparation and notes.

## Remaining Risks

- `INTERNAL_ALPHA_NOTES.md` known issues should be refreshed after any tester-blocking discovery.
- The build still has the existing Vite large chunk warning.
- Content validation is currently clean with 0 warnings.
