# Reference Deviation Matrix

Prompt: 133 - Reference-Locked UI/World Recovery Plan And Freeze

This matrix freezes the target direction for prompts 133-146. It is not a permission slip for creative reinterpretation; the `REF_*` images are target layouts, compositions, and UX states.

| Reference | Scene/window | Current state | Target reference | Major gaps | Must preserve | Implementation risk | Acceptance gate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| REF_133 | Normal town HUD | Prior R1 HUD exists, but new pack raises the baseline for compact chat, right inventory, hotbar clarity, and production feel. | `REF_133_TOWN_HUD_BASELINE.png` | Need freeze against debug-like copy and panel clutter; town density must remain readable. | Existing first-hour route, vitals, minimap, hotbar, inventory awareness. | Medium: HUD layout changes can break mobile/hotbar safety. | Desktop/mobile screenshot proof; no debug UI; no overlap. |
| REF_134 | Spellbook window | Spellbook exists, but scroll/overflow and footer containment are the prompt focus. | `REF_134_SCROLLABLE_SPELLBOOK.png` | Dense content can hide actions or leak page scroll. | Existing spells, filters, hotbar assignment semantics. | Medium: scroll/focus handling touches input contracts. | Wheel stays inside spellbook; actions visible; no hidden overflow. |
| REF_135 | Player chat | Chat exists and is compactable, but needs target-locked player chat composition. | `REF_135_PLAYER_CHAT.png` | Chat can become too dense or too tall over the playfield. | Chat focus isolation and channel semantics. | Medium: chat input can steal game controls if mishandled. | Typing does not trigger hotkeys; readable chat screenshot. |
| REF_136 | Build Mode spatial UX | Current/negative Build Mode pattern must not be repeated. | `REF_136_BUILD_MODE_SPATIAL.png` | Abstract 2D table feel, weak plot context, and detached placement feedback. | Existing housing placement rules, material costs, collision/pathing validation. | High: build mode combines renderer, input, UI, and placement state. | Plot context + ghost visible; no duplicated panels; targeted housing tests. |
| REF_137 | Production copy | Crafting/service panels exist, but player copy must be purged of dev/implementation language. | `REF_137_PRODUCTION_COPY.png` | Debug-like labels, system terms, and internal copy risk. | Existing crafting/repair functionality and recipe data. | Low/Medium: copy-only if scoped; higher if layout shifts. | Visible copy audit; screenshot proof; content tests if strings change. |
| REF_138 | Profession Atlas | Existing Atlas is functional but the negative current state shows unacceptable dev-wiki drift. | `REF_138_PROFESSION_ATLAS.png` | Needs player-readable lenses/pathways and restrained detail density. | Existing classless progression, skill/profession data, pin/open actions. | Medium/High: dense UI and search/focus can regress. | Atlas screenshot proof; no overlapping text; profession UI tests. |
| REF_139 | Dense menu readability | Spellbook and dense panels exist, but need readability pass. | `REF_139_SPELLBOOK_READABILITY.png` | Lists/details/actions may crowd, wrap poorly, or overlap at small sizes. | Existing spell roles, categories, selected spell behavior. | Medium: shared dense panel CSS can affect other windows. | Text overlap checks; mobile/desktop screenshots; spellbook tests. |
| REF_140 | Traversable road/forest | Existing road/forest refs exist, but invisible-wall mismatch is explicitly in scope. | `REF_140_TRAVERSABLE_ROAD_FOREST.png` | Collision may not match visible path edges and route affordances. | Area transitions, combat lanes, Golden Path movement. | High: traversal and collision touch gameplay correctness. | Browser movement smoke through obvious lanes; movement tests. |
| REF_141 | Environment quality bar | Existing voxel kit/density docs exist, but this is the minimum quality bar for rebuilt spaces. | `REF_141_ENVIRONMENT_QUALITY_BAR.png` | Richer silhouettes, modular prop placement, and stronger composition required. | Browser Three.js budget, shared materials, readable lanes. | High: visual density can break performance/input. | Render budget and screenshot proof for changed scenes. |
| REF_142 | Briarbrook town rebuild | Current town has prior reference work but prompt demands rebuild from scratch against two town targets. | `REF_142_TOWN_SQUARE_HERO.png`, `REF_142_TOWN_MARKET_STREET.png` | Town square/market must feel composed, not procedurally scattered. | Services, NPCs, exits, first-hour route, minimap markers. | High: scene rebuild risks collision, budget, and route readability. | Town screenshots, route smoke, town reference tests. |
| REF_143 | Road and forest rebuild | Existing Old River Road and Greymont Forest approximations exist. | `REF_143_OLD_RIVER_ROAD.png`, `REF_143_GREYMONT_FOREST.png` | Need stronger road mood, forest silhouette, resource context, and readable combat/gathering lanes. | Combat intent, resource affordances, area transitions. | High: render/collision/resource systems interact. | Road/forest screenshots, resource/transition tests. |
| REF_144 | Forgotten Crypt rebuild | Existing crypt approximation exists. | `REF_144_CRYPT_COMBAT.png`, `REF_144_CRYPT_SECRET.png` | Need darker production composition without hiding labels, loot, target frames, or secret affordances. | Combat target state, loot, secret discovery, save/load area state. | High: darkness and props can hurt readability/performance. | Crypt combat/secret screenshots, combat/secret tests. |
| REF_145 | Services and player plot | Implemented service interiors and player plot rebuild. | `REF_145_BANK.png`, `REF_145_SMITHY.png`, `REF_145_PLAYER_PLOT_BUILD.png` | Voxel silhouettes remain blockier than target art; inventory context menu legacy title is generic, but it is topmost and interactable. | Storage, crafting, repair, housing placement, inventory flows. | Medium: remaining gap is art-pipeline fidelity/copy, not core workflow. | `145-smithy.png`, `145-bank.png`, `145-player-plot-build.png`, `145-reference-proof-sheet.png`; service/build/browser proof runner passed. |
| REF_146 | Final parity QA helper | QA board exists only as helper. | `REF_146_REFERENCE_PARITY_QA.png` | Need final cross-reference proof and deviation notes, not gameplay mimicry of board. | All accepted prompts, normal player UI, budgets and gates. | Medium/High: final pass spans all prior surfaces. | QA board comparison, screenshot set, full relevant gates. |

## Freeze Decision

The recovery path is locked to the references above. Work proceeds prompt by prompt, preserving existing gameplay semantics while replacing only the UI/world/collision surfaces explicitly scoped by each prompt.

## Prompt 133 Screenshot Proof

Proof files:

- `artifacts/playwright/133-current-r1-town-hud.png`
- `artifacts/playwright/133-current-r4-environment.png`
- `artifacts/playwright/133-reference-proof-sheet.png`

Deviation note:

- Current R1 town HUD has the required player frame, minimap, chat, hotbar, inventory, and status surfaces with no visible dev overlay, but it is not at REF_133 composition parity: town density, market/fountain staging, right-panel finish, chat compactness, and production polish remain weaker than target.
- Current R4 environment screenshot is below REF_141 quality bar: foliage silhouettes, ground/path material variation, lighting contrast, prop placement, and rich modular composition are not yet target-grade.
- These gaps are intentionally documented under prompt 133. No runtime/gameplay feature expansion was made in this prompt.

## Prompt 134 Screenshot Proof

Proof files:

- `artifacts/playwright/134-spellbook-scroll-contract.png`
- `artifacts/playwright/134-profession-atlas-contract.png`
- `artifacts/playwright/134-chat-scroll-contract.png`
- `artifacts/playwright/134-reference-proof-sheet.png`
- `artifacts/playwright-runner/134-window-scroll-proof.mjs`

Deviation note:

- Current spellbook now follows the REF_134/REF_139 structural contract, but visual asset parity is not complete: spell icon treatment, background art, and reference-level spacing polish remain lower fidelity.
- Profession Atlas no longer matches the specific `CURRENT_ATLAS_BAD.png` overlap pattern in the prompt-134 proof, but prompt 138 remains responsible for target-locking its final composition to `REF_138_PROFESSION_ATLAS.png`.
- Adventure Map service labels were clustered so duplicated service markers do not overlap in the expanded map.

## Prompt 135 Screenshot Proof

Proof files:

- `artifacts/playwright/135-chat-expanded.png`
- `artifacts/playwright/135-chat-compact.png`
- `artifacts/playwright/135-chat-collapsed.png`
- `artifacts/playwright/135-reference-proof-sheet.png`
- `artifacts/playwright-runner/135-chat-reference-proof.mjs`

Deviation note:

- Chat now follows the REF_135 player-facing structure: compact tab row, scrollable log, one input footer, minimal Expand/Compact/Collapse controls, unread collapsed badge, no opacity/retention/channel-toggle debug controls, and no hotbar overlap at 1366x768.
- The current channel row uses the existing gameplay channel model (`Local`, `Party`, `Guild`, `Trade`, `System`) instead of the exact REF_135 `General`, `Trade`, `Guild`, `Local`, settings icon row. This preserves existing channel semantics while matching the target intent and prompt wording.
- REF_135 world art, minimap, status frame, hotbar art, and town composition remain outside prompt-135 scope and are still covered by later town/environment/HUD parity prompts.

## Prompt 136 Screenshot Proof

Proof files:

- `artifacts/playwright/136-build-spatial.png`
- `artifacts/playwright/136-reference-proof-sheet.png`
- `artifacts/playwright-runner/136-build-spatial-proof.mjs`

Deviation note:

- Build Mode no longer uses the forbidden `CURRENT_BUILD_MODE_BAD` center table pattern. The React layer is now a spatial overlay: left palette, transparent world center, right inspector, and bottom action bar, while the existing Three.js world grid/ghost/footprint/orientation projection remains the placement source.
- Current housing plot art, camera angle, minimap stack, and prop density are still below `REF_136_BUILD_MODE_SPATIAL.png` and `REF_145_PLAYER_PLOT_BUILD.png`; those visual-world gaps are preserved for the later environment/player-plot rebuild prompts.
- The right inspector is intentionally shorter at 1366x768 to avoid overlapping the current minimap/location card. Its required fields are scrollable, and material cost is visible without reintroducing raw ghost coordinates.

## Prompt 137 Screenshot Proof

Proof files:

- `artifacts/playwright/137-production-copy-crafting.png`
- `artifacts/playwright/137-production-copy-atlas.png`
- `artifacts/playwright/137-production-copy-spellbook.png`
- `artifacts/playwright/137-reference-proof-sheet.png`
- `artifacts/playwright-runner/137-production-copy-proof.mjs`

Deviation note:

- Normal-mode visible text audit now passes for HUD, chat, inventory, spellbook, Profession Atlas, crafting, bank, market, map, build mode, and journal against the prompt-137 banned copy list.
- Atlas and legacy skills surfaces now use player-facing terms such as `Available`, `Locked`, `Practice in the world`, and `Goal accepted` instead of implementation status language.
- Technical diagnostics remain available only through the dev overlay. Normal-mode copy still does not claim exact visual parity with `REF_137_PRODUCTION_COPY.png`, `REF_138_PROFESSION_ATLAS.png`, or `REF_139_SPELLBOOK_READABILITY.png`; later prompts remain responsible for Atlas composition and dense-menu readability parity.

## User-Reported Usability Blocker Proof

Proof files:

- `artifacts/playwright/137-window-drag-context-menu.png`
- `artifacts/playwright/137-market-board-click.png`
- `artifacts/playwright-runner/137-window-interaction-blockers-proof.mjs`

Resolution note:

- React floating windows now expose drag handles and use a shared draggable-window contract. Browser proof moved the inventory window by pointer dragging its header.
- Inventory item right-click/hotbar assignment menus and context menus now render above the React window layer and are verified as the top interactive element at the menu point.
- Market Board work-order rows are selectable; clicking a row updates the detail pane and marks exactly one selected row.

## Prompt 138 Screenshot Proof

Proof files:

- `artifacts/playwright/138-profession-atlas.png`
- `artifacts/playwright/138-reference-proof-sheet.png`
- `artifacts/playwright-runner/138-profession-atlas-proof.mjs`

Deviation note:

- Profession Atlas now follows the `REF_138_PROFESSION_ATLAS.png` three-zone workspace: left profession lenses plus contracts, center pathway cards with directional cues, right detail pane with player-facing sections, and visible hotbar clearance at 1366x768.
- `CURRENT_ATLAS_BAD.png` issues are removed: no old Skills/Profession/Mastery tab chrome in Atlas mode, no developer status board copy, no floating detail panel over cards, no text overlap in the proof runner, and no 1366 side-pane scroll displacement.
- Copy intentionally keeps the prompt-137 production wording (`Available`, `Locked`, `Hide Locked`) instead of the target image's `Implemented`/`Future` labels. Visual background art and icon fidelity are still below the reference target and remain part of later world/art parity prompts.

## Prompt 139 Screenshot Proof

Proof files:

- `artifacts/playwright/139-spellbook-readability.png`
- `artifacts/playwright/139-crafting-readability.png`
- `artifacts/playwright/139-market-readability.png`
- `artifacts/playwright/139-journal-readability.png`
- `artifacts/playwright/139-map-readability.png`
- `artifacts/playwright/139-skills-mastery-readability.png`
- `artifacts/playwright/139-reference-proof-sheet.png`
- `artifacts/playwright-runner/139-dense-menus-proof.mjs`

Deviation note:

- Spellbook now follows the REF_139 dense-menu structure: left search/filter/known controls, compact spell rows with one short stat, right detail with stats and reagents, fixed action footer, and hotbar clearance.
- Crafting, Market, Journal, Adventure Map, and Skills/Mastery proof states use list/detail or map/detail structure with named sections, scroll containment, no text overlap in the proof runner, no debug copy, and no inventory blocking the map proof.
- Exact icon scale, background art, spellbook action composition, and REF_139-specific Flame Burst content are not fully identical because the current runtime uses existing spell data and known-spell progression. The layout and readability contract is now locked for later parity passes.

## Prompt 140 Screenshot Proof

Proof files:

- `artifacts/playwright/140-road-traversability.png`
- `artifacts/playwright/140-forest-traversability.png`
- `artifacts/playwright/140-reference-proof-sheet.png`
- `artifacts/playwright-runner/140-traversability-proof.mjs`
- `TRAVERSABILITY_AUDIT.md`

Deviation note:

- Greymont Forest's visible bridge centerline is now walkable, and representative blockers report visible environmental causes: stream bank, road fence/riverbank/water edge, crypt pillar, and player-plot water edge.
- Every authored portal origin and requested destination spawn is walkable, has a move exit, is reachable from its area route, and no longer lands directly on another destination portal tile or inside a static blocker. The road, housing, crypt, bank, smithy, and forest return spawns were moved to adjacent visible open landing tiles instead of relying on safe-spawn fallback recovery.
- Current road and forest screenshots still fall short of `REF_140_TRAVERSABLE_ROAD_FOREST.png`, `REF_143_OLD_RIVER_ROAD.png`, and `REF_143_GREYMONT_FOREST.png` in art density, lighting, camera composition, foliage/prop richness, and exact HUD styling. Prompt 140 accepts only the traversal/collision contract; broader environment parity remains for prompts 141 and 143.

## Prompt 141 Screenshot Proof

Proof files:

- `ENVIRONMENT_ART_DIRECTION.md`
- `artifacts/playwright/141-reference-proof-sheet.png`
- `artifacts/playwright-runner/141-environment-art-direction-proof.mjs`

Deviation note:

- Environment art direction is locked to a hybrid pipeline: procedural/modular runtime kit remains the primary production path, with lightweight authored glTF/VOX hero modules allowed only when reused across a location class.
- The document defines visual pillars, acceptable complexity, material palette, lighting presets, prop density rules, forbidden patterns, modular kits, performance budgets, and reference parity targets for town, market street, road, forest, crypt, smithy, bank, and player plot.
- Prompt 141 does not rebuild locations. Current screenshots are still below the target images; prompts 142-145 are responsible for applying this locked bar to the actual scenes.

## Prompt 142 Screenshot Proof

Proof files:

- `artifacts/playwright/142-before-town-square.png`
- `artifacts/playwright/142-town-square-hero.png`
- `artifacts/playwright/142-town-market-street.png`
- `artifacts/playwright/142-reference-proof-sheet.png`
- `artifacts/playwright-runner/142-briarbrook-town-proof.mjs`
- `BRIARBROOK_REBUILD_NOTES.md`

Deviation note:

- Briarbrook town is now organized around the REF_142 composition contract: central fountain/plaza, service street, market side, waterfront/ferry edge, Rumor Board, Market Board, clear bank/smithy/road/forest/ferry paths, sparse NPC labels, and no debug panels in proof.
- The runner verifies screenshot pixels are nonblank, no banned debug/development copy is visible, hotbar overlap is zero, service routes are reachable, and the board/service/exit anchors match the town reference plan.
- Exact painterly asset fidelity, roof/tree material richness, item icon detail, and minimap art still do not match the target bitmap. This is recorded as an art-pipeline deviation; prompt 142 keeps the existing Three.js voxel runtime and implements layout/composition parity without renderer rewrite or new gameplay features.

## Prompt 143 Screenshot Proof

Proof files:

- `artifacts/playwright/143-old-river-road.png`
- `artifacts/playwright/143-greymont-forest.png`
- `artifacts/playwright/143-reference-proof-sheet.png`
- `artifacts/playwright-runner/143-road-forest-proof.mjs`
- `OLD_RIVER_ROAD_REBUILD_NOTES.md`
- `GREYMONT_FOREST_REBUILD_NOTES.md`

Deviation note:

- Old River Road now follows the REF_143 combat-lane composition: visible road spine, river/bridge edge, fences and rubble as visible blockers, lantern/sign/supply dressing, combat pockets, target frame, slash/projectile/damage feedback, and no inventory/status panels blocking the fight proof.
- Greymont Forest now follows the REF_143 gathering composition: readable path network, visible town-road bridge, mine approach landmark, ore/tree affordances, denser understory dressing, resource access proof, and single compact active gathering progress in the world label instead of duplicated HUD progress.
- Exact painterly reference fidelity, foliage/road texture richness, asset silhouettes, and lighting still trail the target bitmaps because the prompt was implemented inside the existing Three.js voxel/procedural kit. This is recorded as an art-pipeline deviation; layout, UX, collision, and screenshot proof contracts are covered for prompt 143.

## Prompt 144 Screenshot Proof

Proof files:

- `artifacts/playwright/144-crypt-combat.png`
- `artifacts/playwright/144-crypt-secret.png`
- `artifacts/playwright/144-reference-proof-sheet.png`
- `artifacts/playwright-runner/144-forgotten-crypt-proof.mjs`
- `FORGOTTEN_CRYPT_REBUILD_NOTES.md`

Deviation note:

- Forgotten Crypt now follows the REF_144 combat and secret composition contract: entrance threshold, central combat chamber, secret reliquary, altar niche, pillars, torch pools, floor breakup, sarcophagus/tomb/altar props, hidden-niche and reliquary cues, spell impact feedback, target frame, and player-facing prompt copy.
- The R3 combat proof uses the REF_143/REF_144 combat UI hierarchy with inventory and spellbook visible and the status panel closed; the R3S secret proof uses a quieter no-panel exploration layout with hidden-niche/reliquary/altar cues and no inventory/spellbook/status clutter.
- Exact painterly stone detail, lighting richness, character models, minimap styling, and bitmap fidelity still trail the target references because this pass keeps the existing Three.js voxel/procedural renderer. This is recorded as an art-pipeline deviation, while layout, traversal, UI, and screenshot-proof acceptance are covered.
