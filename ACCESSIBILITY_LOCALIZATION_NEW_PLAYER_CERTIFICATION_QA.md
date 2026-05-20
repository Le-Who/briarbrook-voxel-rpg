# Accessibility Localization And New Player Certification QA

Prompt: 106-accessibility-localization-and-new-player-certification
Date: 2026-05-20

## Scope

- Added `createAccessibilityCertificationReport` as a read-only certification pass for the current build.
- Certified accessibility defaults, new-player clarity surfaces, and localization readiness from real UI/system outputs.
- Covered critical audio visual substitutes, remappable controls, keyboard/mouse movement modes, UI/font scale, tooltip delay, reduced motion, colorblind status indicators, target sizes, and contrast.
- Covered first-session clarity for movement, interaction, equipment state, active hotbar slot, spell missing requirements, current objective, minimap, inventory weight, and tree/chop validity reasons.
- Covered localization registry health, pseudo-localized text expansion, terminology warnings, required string keys, and icon SVGs without embedded `<text>` elements.

## Acceptance Criteria

- Core loop is playable and understandable with the default guide/help/hotbar/minimap/inventory surfaces.
- Accessibility toggles and defaults are discoverable in Help.
- Critical audio cues have visual substitutes when visual audio cues are enabled.
- Missing spell requirements and invalid tool targets provide explicit reasons.
- Localization readiness has a repeatable certification check instead of relying on manual inspection only.

## Verification

- RED: `npm test -- src\tools\accessibility-certification.test.ts` failed because `AccessibilityCertification` did not exist.
- GREEN focused: `npm test -- src\tools\accessibility-certification.test.ts` passed, 1 file / 3 tests.
- Related focused: `npm test -- src\tools\accessibility-certification.test.ts src\ui\ui-customization.test.ts src\ui\onboarding-ui.test.ts src\content\strings.test.ts src\game\input-action-map.test.ts src\audio\audio-manager.test.ts src\systems\InteractionAffordanceSystem.test.ts` passed, 7 files / 32 tests.
- Full tests: `npm test` passed, 76 files / 353 tests.
- Perf/UI: `npm run test:perf-ui` passed, 12 files / 69 tests.
- Content validation: `npm run content:validate` passed, 0 errors / 0 warnings.
- Build: `npm run build` passed with the existing large chunk warning.

## Done

- Prompt 106 has a certification artifact and regression tests.
- No runtime dependency or heavy UI library was added.
- No debug buttons were added to normal mode.
- Golden Path behavior was left intact.

## Not Done

- Full extraction of every legacy UI literal into the string registry was not completed in this pass.
- No browser screenshot pass was added because this prompt was a certification/tooling pass and the existing perf/UI tests cover layout budgets.

## Remaining Risks

- The localization registry is ready for critical prompts and new systems, but legacy UI panels still contain hardcoded English labels.
- Contrast checks are token-based, not a full pixel-level browser audit.
- Content validation is currently clean with 0 warnings; the Vite large chunk warning remains unchanged.
