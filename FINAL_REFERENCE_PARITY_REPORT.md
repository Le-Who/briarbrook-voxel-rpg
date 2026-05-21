# Final Reference Parity Report

Prompt: `146-reference-locked-final-reference-parity-usability-gate`

Scope: final proof pass for `REF_133` through `REF_145`. `REF_146_REFERENCE_PARITY_QA.png` was used only as a QA-board helper, not as a gameplay target.

Acceptance threshold: accepted references must have readability >= 4, no-overlap/clipping >= 4, interaction clarity >= 4, and debug-clutter absence >= 4.

| Reference | Target screenshot | Implemented screenshot | Layout | Readability | World composition | Interaction clarity | No overlap/clipping | No debug clutter | Remaining gaps | Accepted |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| REF_133_TOWN_HUD_BASELINE | `REF_133_TOWN_HUD_BASELINE.png` | `artifacts/playwright/133-current-r1-town-hud.png` | 4 | 4 | 4 | 4 | 4 | 5 | Voxel/UI finish still differs from target bitmap polish. | Yes |
| REF_134_SCROLLABLE_SPELLBOOK | `REF_134_SCROLLABLE_SPELLBOOK.png` | `artifacts/playwright/134-spellbook-scroll-contract.png` | 4 | 5 | 4 | 5 | 5 | 5 | Exact spellbook art treatment differs from reference. | Yes |
| REF_135_PLAYER_CHAT | `REF_135_PLAYER_CHAT.png` | `artifacts/playwright/135-chat-expanded.png` | 4 | 5 | 4 | 5 | 5 | 5 | Channel labels preserve current game semantics rather than exact reference names. | Yes |
| REF_136_BUILD_MODE_SPATIAL | `REF_136_BUILD_MODE_SPATIAL.png` | `artifacts/playwright/136-build-spatial.png` | 4 | 4 | 4 | 5 | 5 | 5 | Build grid/ghost are voxel primitives, not bespoke target art. | Yes |
| REF_137_PRODUCTION_COPY | `REF_137_PRODUCTION_COPY.png` | `artifacts/playwright/137-production-copy-spellbook.png` | 4 | 5 | 4 | 5 | 5 | 5 | Diagnostic tooling remains dev-only; normal copy audit passes. | Yes |
| REF_138_PROFESSION_ATLAS | `REF_138_PROFESSION_ATLAS.png` | `artifacts/playwright/138-profession-atlas.png` | 4 | 4 | 4 | 4 | 5 | 5 | Atlas icon/background fidelity remains below bitmap target. | Yes |
| REF_139_SPELLBOOK_READABILITY | `REF_139_SPELLBOOK_READABILITY.png` | `artifacts/playwright/139-spellbook-readability.png` | 4 | 5 | 4 | 5 | 5 | 5 | Uses current runtime spell data instead of exact reference spell set. | Yes |
| REF_140_TRAVERSABLE_ROAD_FOREST | `REF_140_TRAVERSABLE_ROAD_FOREST.png` | `artifacts/playwright/140-reference-proof-sheet.png` | 4 | 4 | 4 | 5 | 5 | 5 | Painterly road/forest art fidelity still trails target. | Yes |
| REF_141_ENVIRONMENT_QUALITY_BAR | `REF_141_ENVIRONMENT_QUALITY_BAR.png` | `artifacts/playwright/141-reference-proof-sheet.png` | 4 | 5 | 4 | 4 | 5 | 5 | Quality bar is locked; exact art-pipeline fidelity remains incremental. | Yes |
| REF_142_TOWN_SQUARE_HERO | `REF_142_TOWN_SQUARE_HERO.png` | `artifacts/playwright/142-town-square-hero.png` | 4 | 4 | 4 | 5 | 5 | 5 | Voxel roofs/trees/materials are blockier than target. | Yes |
| REF_142_TOWN_MARKET_STREET | `REF_142_TOWN_MARKET_STREET.png` | `artifacts/playwright/142-town-market-street.png` | 4 | 4 | 4 | 5 | 5 | 5 | Market street silhouettes remain voxel-kit level. | Yes |
| REF_143_OLD_RIVER_ROAD | `REF_143_OLD_RIVER_ROAD.png` | `artifacts/playwright/143-old-river-road.png` | 4 | 4 | 4 | 5 | 5 | 5 | Road texture/lighting richness still below target bitmap. | Yes |
| REF_143_GREYMONT_FOREST | `REF_143_GREYMONT_FOREST.png` | `artifacts/playwright/143-greymont-forest.png` | 4 | 4 | 4 | 5 | 5 | 5 | Forest foliage detail remains constrained by voxel kit. | Yes |
| REF_144_CRYPT_COMBAT | `REF_144_CRYPT_COMBAT.png` | `artifacts/playwright/144-crypt-combat.png` | 4 | 4 | 4 | 5 | 5 | 5 | Stone/lighting fidelity remains blockier than target. | Yes |
| REF_144_CRYPT_SECRET | `REF_144_CRYPT_SECRET.png` | `artifacts/playwright/144-crypt-secret.png` | 4 | 4 | 4 | 5 | 5 | 5 | Dark secret-room mood is readable but less painterly than reference. | Yes |
| REF_145_SMITHY | `REF_145_SMITHY.png` | `artifacts/playwright/145-smithy.png` | 4 | 4 | 4 | 5 | 5 | 5 | Forge/workshop silhouettes remain voxel primitives. | Yes |
| REF_145_BANK | `REF_145_BANK.png` | `artifacts/playwright/145-bank.png` | 4 | 4 | 4 | 5 | 5 | 5 | Bank props are lower-fidelity than target art; service interaction passes. | Yes |
| REF_145_PLAYER_PLOT_BUILD | `REF_145_PLAYER_PLOT_BUILD.png` | `artifacts/playwright/145-player-plot-build.png` | 4 | 4 | 4 | 5 | 5 | 5 | Plot grid/ghost remain runtime primitives, but no abstract table panel remains. | Yes |

## Usability Gate

- Important windows scroll: verified by spellbook, dense panels, market, journal, map, Atlas, crafting, bank/inventory, and build proof runners.
- Chat usable: prompt 135 proof covers expanded, compact, collapsed, input focus, unread state, and no hotbar overlap.
- Build mode spatial: prompt 136 and 145 proof cover palette, world ghost, inspector, action bar, plot grid, and no abstract fake-grid table.
- Atlas readable: prompt 138 proof covers three-zone layout, no dev-wiki copy, no overlap.
- Spellbook readable: prompts 134 and 139 cover scroll containment, detail pane, fixed footer, and readability.
- Map readable: prompt 139 map proof covers map/detail structure and no inventory obstruction.
- Inventory/equipment states clear: React inventory/hotbar tests and 145 browser proof cover item states, drag, bank pairing, and right-click context menu top layer.
- No meaningless invisible walls: prompts 140, 143, 144, and 145 traversal checks cover obvious routes and visible blocker causes.
- No raw debug labels in normal mode: prompt 137 copy audit and later proof runners check banned debug/development copy.
- Hotbar remains usable: prompt proof runners keep hotbar visible and verify no overlap in key states.
- Tooltip stable: perf UI gate and tooltip tests pass.
- UI reset works: proof runners call `briarbrookUI.resetUiLayout()` before captures and continue to pass.

## Final Verification

- `node artifacts\playwright-runner\145-service-plot-proof.mjs`: passed.
- `npm run lint`: passed.
- `npm test`: 91 files / 432 tests passed.
- `npm run test:perf-ui`: 12 files / 78 tests passed.
- `npm run content:validate`: PASS, 0 errors, 0 warnings, 0 dead references.
- `npm run build`: passed with the known Vite large chunk warning.
