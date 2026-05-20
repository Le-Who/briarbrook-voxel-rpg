# Visual Reference Map

Prompt 109 treats the provided screenshots as practical target states for the current TypeScript + Three.js voxel RPG. They are not pixel-perfect source art, matte paintings, or a runtime asset pack. Each reference maps to an interactive scene, panel state, or route state that should be built with the existing orthographic voxel renderer, UI windows, and performance budgets.

## Filename Mapping

| Ref | Filename | Target State | Primary Runtime Surface | Notes |
| --- | --- | --- | --- | --- |
| R1 | `R1-briarbrook-town-square-hero-hud.png` | Briarbrook Town Square, main hub, hero HUD | Town area, HUD, chat, inventory/status panels, minimap | Dense but readable town square with fountain, NPCs, market, flowers, banners, and the default normal-play layout. |
| R2 | `R2-old-river-road-combat.png` | Old River Road, bandit combat | Road area, combat target plate, damage numbers, combat VFX | Threat-readable outdoor combat with ally support, open lanes, and one clear selected enemy. |
| R3 | `R3-forgotten-crypt-combat.png` | Forgotten Crypt, undead combat | Crypt area, party frame, loot labels, target outline | Dark dungeon readability target with warm torches, rubble, pillars, and secret/loot affordances. |
| R4 | `R4-greymont-forest-gathering-mine.png` | Greymont Forest, gathering and mine entrance | Forest area, gathering feedback, inventory resources | Forest density target with harvestable trees, ore veins, mine entrance, and temporary resource feedback only. |
| R5 | `R5-broms-smithy-crafting-ui.png` | Brom's Smithy, crafting and repair UI | Smithy interior, crafting panel, queue | Interior cutaway target with forge lighting, material bins, tool racks, recipes, requirements, quantity, and queue. |
| R6 | `R6-briarbrook-bank-storage-ui.png` | Briarbrook Bank, storage and inventory UI | Bank interior, inventory panel, bank storage panel | Counter interaction state with banker prompt, shelves, storage grid, and item transfer actions. |
| R7 | `R7-player-plot-housing-build-mode.png` | Player Plot, housing build mode | Housing area, build menu, placement ghost, grid | Build placement target with transparent valid ghost, plot grid, part catalog, cost, and input hinting. |
| R8 | `R8-profession-atlas-ui.png` | Profession Atlas | Skills modal, profession relationship graph | Usable relationship map of professions, skills, tools, resources, outputs, services, and milestones. It must not become a passive skill tree. |
| R9 | `R9-adventure-map-expanded-ui.png` | Adventure Map, expanded region map and compact minimap | Map modal, minimap, quest tracker, right panels | Region navigation target with route overlay, legend, labels, quest toggle, and consistent surrounding HUD. |

## Shared Layout Anchors

- Camera: isometric orthographic or near-orthographic with readable silhouettes before detail.
- HUD: top-left vitals, top-right circular minimap/location, bottom-left chat, bottom hotbar/progress, right-side panels.
- UI skin: warm dark translucent panels, thin borders, gold accents, compact headings, stable tooltips.
- Interactions: prompts appear only near useful interactables; no permanent resource labels; resource gain and loot labels fade.
- Runtime contract: use procedural voxel geometry first, glTF/glb through `AssetManager` only for reusable complex props, and no runtime dependency on Blockbench or MagicaVoxel.

## Reference Checklist

- [x] R1 mapped to Briarbrook Town Square hub target.
- [x] R2 mapped to Old River Road combat target.
- [x] R3 mapped to Forgotten Crypt combat target.
- [x] R4 mapped to Greymont Forest gathering target.
- [x] R5 mapped to Brom's Smithy crafting target.
- [x] R6 mapped to Briarbrook Bank storage target.
- [x] R7 mapped to Player Plot build-mode target.
- [x] R8 mapped to Profession Atlas target.
- [x] R9 mapped to Adventure Map target.
