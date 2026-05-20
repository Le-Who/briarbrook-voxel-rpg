# Data-Driven Content Authoring Validation QA

Prompt: 103-data-driven-content-authoring-validation
Date: 2026-05-20

## Scope

- Extended the shipped content registry to include professions, mastery milestones, profession contracts, living-world event definitions, and derived map marker definitions.
- Extended validation coverage for items, icons, recipes, spells, profession graphs, mastery requirements, profession contracts, work order reward recipes/vouchers/discounts, live economy state, events, and map markers.
- Added authoring tools for item, spell, and recipe previews, dead-reference detection, localization key export, spawn test area listing, and JSON/text report export.
- Added `npm run content:validate` as the project-local validation/report command.

## Acceptance Check

- Designers and agents can add content through the registry-backed domains without silently breaking references.
- Critical broken references fail validation and the validation command exits nonzero.
- Missing visuals and broad authoring labels remain warnings so runtime can fall back gracefully.
- The validation report exposes counts, previews, dead references, expected localization keys, and spawn test scene IDs.

## Data Fixes

- Fixed the healer profession graph recipe node to reference recipe id `brew_heal_potion` instead of item id `health_potion`.

## Verification

- RED: `npm test -- src\tools\content-authoring.test.ts` failed before `ContentAuthoringTools` and new registry domains existed.
- GREEN: `npm test -- src\tools\content-authoring.test.ts` passed.
- Content command: `npm run content:validate` passed with 0 errors and 0 warnings.

## Known Warnings

- No current content-validation warnings.

## Risks

- Localization key export is an authoring contract list, not a runtime translation catalog yet.
- The validation command uses Vite SSR to load TypeScript directly; this avoids a new dependency but means the command depends on the Vite toolchain being installed.
- Event `economyImpact` entries should stay exact economy categories or item IDs so content validation remains clean.
