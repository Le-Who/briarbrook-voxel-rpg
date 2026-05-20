# Visual Reference Implementation Plan

This plan translates the nine prompt 109 target screenshots into real engine work for the current browser-based TypeScript + Three.js voxel RPG. The implementation should extend existing systems rather than create a parallel mockup layer: `VoxelRenderer` area builders, `VoxelKit` reusable voxel builders, `MaterialLibrary`, `AssetManager`, `VisualPrefabRegistry`, and the current managed UI panels remain the foundation.

## Realism Contract

- Build interactive states, not static images.
- Prefer procedural voxel pieces and existing `VoxelKit` builders for houses, trees, ore, fences, bridges, lamps, banners, forge pieces, columns, rubble, and chests.
- Add new reusable builders only when a prop family repeats across scenes: roof trims, flower beds, counters, shelves, tool racks, signposts, crafting bins, grave markers, mine supports, housing ghost parts.
- Use shared materials, cached box geometries, and instancing/batching for repeated low-detail props such as flowers, grass tufts, cobbles, fence posts, crates, books, ore bits, roof tiles, and small stones.
- Route any exported Blockbench/MagicaVoxel assets through source files and `AssetManager` runtime paths; the browser runtime must not depend on launching external tools.
- Keep lighting simple: authored ambient/fog per area plus a small number of meaningful point lights for lamps, torches, forges, spell impacts, and map markers.
- Keep UI as live HTML/CSS/React-like panels from the existing window stack. Do not bake UI into screenshots.

## Shared Visual Rules

- Camera remains isometric orthographic or near-orthographic.
- Voxel forms stay compact and readable at desktop and mobile sizes.
- Palette stays restrained: weathered timber, muted plaster, mossy stone, olive grass, desaturated roads, warm fire, blue civic cloth, and sparse magic accents.
- Prop density is moderate: enough to make areas lived-in, not enough to hide pathing, enemies, NPCs, or click targets.
- Labels are transient unless they are character/NPC names or selected target UI.
- Resource labels are never permanent; use short-lived gain floats such as `+12 Wood`.
- HUD layout stays consistent across references: vitals, minimap, chat, hotbar, right panels.
- Tooltip placement and panel opening must not cause layout shift or per-frame DOM churn.

## R1 - Briarbrook Town Square / Hero HUD

Scene purpose:
- Establish Briarbrook as the central first-hour hub and default normal-play presentation.

Required location changes:
- Increase town square density around the fountain with cobble variation, fenced beds, benches/crates, lamp posts, civic banners, market stall dressing, readable road exits, and NPC clustering.
- Preserve movement lanes around the fountain, market, bank/smithy paths, and exit signs.

Prop/art-kit additions:
- Flower-bed scatter builder, civic sign/banner variants, market produce crates, low benches, window boxes, fountain trim variants, small dock/river edge props where visible.

Lighting mood:
- Warm daytime town light, soft building shadows, small lamp accents. No heavy post-processing.

UI changes:
- Ensure default HUD composition supports top-left vitals, top-right minimap, bottom-left chat, bottom hotbar/progress, and right inventory/status panels without overlap.

Gameplay state:
- Safe town hub with NPC discovery, chat, inventory awareness, map awareness, and the start of the first-hour route.

Acceptance criteria:
- Player, fountain, three or more named NPCs, market, town exits, and minimap location are readable within 3 seconds.
- With inventory/status/chat/hotbar open, no critical interaction target is blocked at 1366x768 or 1920x1080.
- Town render stats stay inside the R1 budget in `VISUAL_BUDGET.md`.

Out of scope:
- Pixel-perfect building silhouettes, unique house models for every facade, permanent crowd simulation.

Checklist:
- [x] Fountain square has navigable dense dressing.
- [x] NPC labels and interact prompts are readable but not noisy.
- [x] Market/bank/smithy routes remain visually distinct.
- [x] Default HUD works on desktop and mobile smoke viewports.
- [x] Render stats are captured after the density pass.

## R2 - Old River Road / Bandit Combat

Scene purpose:
- Communicate a clear outdoor combat encounter without losing path readability.

Required location changes:
- Shape the road into an open combat lane with stone walls, fence breaks, lanterns, roadside grass, and at least one landmark building/ruin edge.
- Leave clean space around player, ally, and enemies for melee arcs and target outlines.

Prop/art-kit additions:
- Roadside wall segments, broken fence posts, bandit camp clutter, lantern stand variants, combat-safe grass/flower clusters.

Lighting mood:
- Slightly darker road mood than town, warm lantern contrast, enemies still silhouette cleanly.

UI changes:
- Top-center target plate for selected enemy; floating damage numbers; short melee slash arc; enemy overhead bars; no debug combat buttons.

Gameplay state:
- Player and ally fighting bandits, target selection visible, damage/recovery readable, minimap still useful.

Acceptance criteria:
- Selected enemy, health change, and player-facing attack feedback are readable in a single screenshot and during live play.
- At least one combat fallback path remains clear: melee, bow, potion/bandage, or low-cost spell.
- Road render stats and active effect counts stay inside budget.

Out of scope:
- Large particle trails, cinematic hitstop, complex enemy formation AI in this visual pass.

Checklist:
- [x] Road combat lane leaves player and enemy silhouettes unobstructed.
- [x] Damage numbers and target plate fade/update without DOM churn.
- [x] Ally and enemy labels do not overlap the minimap or right panels.
- [x] Bandit props reuse road/town kit materials.
- [x] Combat smoke verifies no Golden Path regression.

## R3 - Forgotten Crypt / Undead Combat

Scene purpose:
- Make the crypt feel dangerous and darker while preserving tactical readability.

Required location changes:
- Add broken walls, columns, rubble piles, cracked floors, blood/dirt decals where cheap, torch stands, bones, and small loot landmarks.
- Keep at least one main loop path and one secret/side curiosity visibly navigable.

Prop/art-kit additions:
- Crypt torch bracket, skull/bone clusters, cracked tile variants, grave/altar fragments, small loot pile, secret wall indicator.

Lighting mood:
- Low ambient, warm torch pools, subtle fog/dark background, selected enemy outline stronger than environmental red accents.

UI changes:
- Party frame support when a companion is active; selected undead target plate; loot labels fade; inventory/status remain stable.

Gameplay state:
- Player and companion are fighting undead, loot has dropped, and the space hints at dungeon secrets.

Acceptance criteria:
- Skeleton/undead enemies read against the floor and walls.
- Loot labels are temporary and do not hide combat targets.
- Dynamic lights stay at or below the shared dynamic light budget.

Out of scope:
- Fully destructible dungeon architecture, high-end volumetric darkness, unique skeletal animation rigs.

Checklist:
- [x] Torch pools guide pathing without hiding enemies.
- [x] Crypt props reuse dungeon builders or new reusable crypt builders.
- [x] Companion/party UI remains compact.
- [x] Loot and secret affordances are visible but not permanent labels.
- [x] Save/load smoke confirms crypt area and UI state are stable.

## R4 - Greymont Forest / Gathering And Mine

Scene purpose:
- Show that gathering, mining, and route discovery are active gameplay, not static scenery.

Required location changes:
- Improve forest layering with trees, mossy rocks, ore veins, mine entrance supports, tracks, cart, flowers, and path contrast.
- Keep harvestable nodes distinct from background dressing.

Prop/art-kit additions:
- Mine support builder, ore accent variants, mine cart, chopped stump, wood-chip scatter, fern/flower instancing, resource node highlight state.

Lighting mood:
- Lush green forest with dappled light, readable mine entrance shadow, ore accents restrained.

UI changes:
- Resource gain float near active harvest; inventory resource stacks visible; no permanent labels on every node.

Gameplay state:
- Player is actively chopping/mining, resources are added, and the mine/crypt route is discoverable.

Acceptance criteria:
- The active tree or ore node is visually distinguishable from decorative props.
- Resource feedback fades and never becomes a permanent world label.
- Dense forest props remain batched/instanced where practical.

Out of scope:
- Procedural forest generation at world scale, full tree falling physics, per-leaf animation.

Checklist:
- [x] Forest path and mine entrance are readable from the default camera.
- [x] Harvestable trees/ore have clear hover or active states.
- [x] Resource gain is temporary and event-driven.
- [x] Repeated foliage/ore bits use shared geometry/materials.
- [x] Forest render stats remain below budget after density pass.

## R5 - Brom's Smithy / Crafting UI

Scene purpose:
- Make crafting and repair feel grounded in a real workshop while keeping the recipe UI usable.

Required location changes:
- Build a readable open-roof smithy interior with forge, anvil, ore/coal bins, tool racks, workbench, civic banner, and clear NPC placement.
- Keep enough empty floor around Brom and the anvil for prompts and player movement.

Prop/art-kit additions:
- Tool rack builder, ore bin variants, workbench clutter, bellows/forge trim, ingot stack, coal pile, wall hooks.

Lighting mood:
- Strong forge orange around the hearth, warm interior shadows, controlled point-light count.

UI changes:
- Crafting panel with recipe list, selected recipe, requirements, quantity stepper, craft button, queue row, and failure messaging.

Gameplay state:
- Player can inspect recipes, verify requirements, start a craft/repair, and see queued progress.

Acceptance criteria:
- Recipe requirements and craft action fit without text clipping at desktop and mobile smoke widths.
- Crafting state updates are event-driven and do not rebuild the full HUD per frame.
- Forge light does not push dynamic lights over budget.

Out of scope:
- Full crafting economy rebalance, animated blacksmith production line, unique model for every recipe item.

Checklist:
- [x] Smithy interior has clear forge, anvil, Brom, and material bins.
- [x] Recipe list and selected recipe state are interactive.
- [x] Queue feedback is live in the R5 service state and craft start is verified through Brom's public forge.
- [x] Requirements use existing inventory/resource data.
- [x] UI and render budgets are checked with the crafting panel open.

## R6 - Briarbrook Bank / Storage UI

Scene purpose:
- Make banking feel like a secure interior and prove inventory/storage transfer readability.

Required location changes:
- Enrich bank interior with counter, shelves, ledgers, rug/banner, chests, lanterns, storage stacks, and a clear banker interaction line.
- Keep counter collision and prompt position predictable.

Prop/art-kit additions:
- Ledger/book stacks, shelf clutter, bank counter variants, storage chest variants, rug/banner material variant.

Lighting mood:
- Warm controlled interior, safe/official tone, fewer noisy props than the market.

UI changes:
- Inventory and Bank Storage windows visible together; transfer actions such as Take All; item stack counts and capacity remain readable.

Gameplay state:
- Player talks to banker and moves items between carried inventory and storage.

Acceptance criteria:
- Banker prompt is readable and does not overlap the NPC name.
- Inventory and bank storage can be operated together without window-layer confusion.
- Storage UI stays inside DOM/window budgets.

Out of scope:
- Complex banking permissions, auction house behavior, remote account vaults.

Checklist:
- [x] Bank counter/NPC/prompt relationship is stable.
- [x] Bank storage and inventory windows support paired use on desktop and stacked use on phone viewports.
- [x] Capacity and stack counts remain readable.
- [x] Shelf/chest clutter does not hide pathing.
- [x] Window layering issue from prompt 91 is retested here.

## R7 - Player Plot / Housing Build Mode

Scene purpose:
- Show housing placement as a real editable mode with clear validity, cost, and controls.

Required location changes:
- Improve plot area with fenced boundary, water/dock edge, nearby town context, grid overlay, and buildable flat footprint.
- Keep normal world props muted while placement ghost is active.

Prop/art-kit additions:
- Build ghost material, grid line helper, wall/floor/door/roof icon variants, plot fence, foundation markers, small workshop object set.

Lighting mood:
- Bright outdoor town/plot light; green valid placement ghost and red/yellow invalid/blocked variants.

UI changes:
- Build menu with categories, piece grid, selected item, cost, and Place action; compact placement help panel; snap-to-grid toggle.

Gameplay state:
- Player selects a structure piece, previews it, rotates/snaps/cancels, and places a useful object.

Acceptance criteria:
- Valid/invalid placement is readable without debug buttons.
- Grid and ghost are batched/lightweight and do not tank frame time.
- Placed object persists through save/load.

Out of scope:
- Full structural simulation, arbitrary freeform mesh editing, neighborhood multiplayer ownership.

Checklist:
- [x] Build menu has real categories and selected piece state.
- [x] Placement ghost uses transparent material and clear footprint.
- [x] Controls are discoverable but not noisy in normal play.
- [x] Object placement persists after save/load.
- [x] Housing smoke keeps Golden Path route intact.

## R8 - Profession Atlas

Scene purpose:
- Explain profession relationships as an operational map, not a passive skill tree.

Required location changes:
- No world location changes required beyond keeping the background dimmed and non-interactive while the modal is active.

Prop/art-kit additions:
- UI icon set for profession families, milestones, tools, resources, outputs, services, and activities. Reuse cached icons where possible.

Lighting mood:
- Background town is dimmed; modal remains warm, crisp, and legible.

UI changes:
- Skills window gains/keeps tabs for Skill Ledger, Profession Atlas, and Mastery; center graph supports pan/zoom or compact fit; left family filters; right details panel.
- Use a custom SVG/canvas/HTML graph unless a graph dependency is already justified. Do not add a heavy dependency only for this modal.

Gameplay state:
- Player selects Blacksmithing or another profession and sees related skills, tools, resources, activities, outputs, services, and next milestones.

Acceptance criteria:
- The atlas exposes relationships, recommended core skills, tool affinity, next milestone, and related professions.
- It is interactive: selecting a node updates details and filters affect visible nodes.
- Graph layout is computed on state change, not every frame.

Out of scope:
- A passive perk tree, mandatory build planner, AI-generated career advisor.

Checklist:
- [x] Graph nodes represent professions and relationships, not just skills.
- [x] Filter and selected-node details are keyboard/mouse usable.
- [x] Tooltip/details state is stable.
- [x] DOM/SVG node count remains inside budget.
- [x] No heavy graph dependency is added without a separate approval.

## R9 - Adventure Map

Scene purpose:
- Provide a region-level navigation surface while keeping the compact minimap and current HUD coherent.

Required location changes:
- World scene should remain readable behind the modal, but no extra world assets are required for the map plan itself.

Prop/art-kit additions:
- Map texture/tiles can be procedural or stylized HTML/canvas/SVG; icons for town, forest, road, crypt, plot, quest, player, route, and point of interest should use cached markup.

Lighting mood:
- Background remains normal play; map panel dominates with dark frame and readable terrain colors.

UI changes:
- Expanded map window with region selector, world tier selector, legend, labels, quest route toggle, route overlay, point markers, and close affordance.
- Compact minimap remains visible and consistent with objective/route state.

Gameplay state:
- Player is in Greymont Fields/region, sees Briarbrook, Greymont Forest, Old River Road, Forgotten Crypt, Your Plot, and active quest route.

Acceptance criteria:
- Quest route can be toggled and updates without rebuilding unrelated HUD.
- Expanded map labels do not collide at common viewport sizes.
- Compact minimap still shows player/objective context while the map is open.

Out of scope:
- Infinite scroll world map, real GIS-style pathfinding, online map sharing.

Checklist:
- [x] Expanded map uses live route/objective data.
- [x] Legend and labels are readable and localized consistently with the current UI language.
- [x] Quest route toggle is interactive and persists where appropriate.
- [x] Minimap redraw remains event-driven/dirty-state based.
- [x] Map smoke verifies no dev travel/debug buttons in normal mode.

## Prompt 117 Closure

Done:
- Unified R1-R9 screenshot parity prompts and removed the debug-like screenshot readiness prompt from live captures.
- Verified the shared HUD baseline across all nine presets at 1366x768, 1600x900, and 1920x1080 with UI scales 90%, 100%, 110%, and 125%.
- Added a 117 Playwright smoke that checks player frame, hotbar, minimap, chat, combat target frame behavior, required action controls, normal-mode debug absence, managed-window hotbar safety, and render/DOM budgets.
- Added build-panel scroll containment so higher-scale build mode does not trigger window QA overflow warnings.
- Captured nine new 117 screenshot artifacts under `artifacts/playwright/117-*.png`.

Not done:
- No pixel-perfect scene-copy pass was attempted.
- No new runtime asset pipeline or external model dependency was added.

Remaining risks:
- The `tool:torch` prefab is documented as procedural-only; future authored torch source work should add a real `.vox` path before changing its source tool.
- Browser automation still emits AudioContext autoplay and `ReadPixels` screenshot warnings.
- R4 transitions from the short tree affordance prompt to live gathering progress once simulation ticks, which is intentional for an interactive state.

## Prompt 118 Closure

Done:
- Created `REFERENCE_QA_MATRIX.md` with the required R1-R9 rows and acceptance columns.
- Added `artifacts/playwright-runner/118-reference-qa-matrix-smoke.mjs` to verify scene presence, UI state, gameplay affordance, performance budget, debug absence, screenshot parity, memory, DOM updates, and tooltip stability.
- Ran the 118 matrix smoke successfully with no row issues.
- Completed the cut pass: no debug controls in normal captures, no permanent resource label layer, no over-budget VFX/props, and build-window scroll containment remains in place from prompt 117.

Not done:
- No pixel-perfect art-matching pass was added.
- No new authored external assets were introduced.

Remaining risks:
- `tool:torch` no longer has a content-pipeline sourcePath warning because its registry entry is procedural-only.
- AudioContext autoplay and `ReadPixels` warnings remain automation-only noise.

## Prompt 109 Closure

Done:
- Mapped all nine references to current engine surfaces and target interactive states.
- Defined a stack-realistic interpretation for each reference with location changes, prop additions, lighting, UI, gameplay state, acceptance criteria, out-of-scope details, and checklist.
- Created a shared visual contract that protects Golden Path, runtime feasibility, and UI responsiveness.
- Created separate performance budgets in `VISUAL_BUDGET.md`.

Not done:
- No runtime scene or UI implementation was started in prompt 109.
- No new assets were authored yet.
- No visual screenshots were regenerated against the new plan.

Remaining risks:
- Prompt 91's multi-window layering issue must be retested before bank/smithy/map heavy UI is accepted.
- The visual pass can easily exceed mesh and DOM budgets if repeated props are added as unique meshes/elements.
- Full first-hour and 60-minute soak remain outside prompt 109 and must stay release gates from earlier prompts.
