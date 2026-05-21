# UI World Recovery Audit

Prompt: 133 - Reference-Locked UI/World Recovery Plan And Freeze

Reference lock:

- Production baseline: `REF_133_TOWN_HUD_BASELINE.png`
- Environment quality bar: `REF_141_ENVIRONMENT_QUALITY_BAR.png`
- Negative references only: `CURRENT_BUILD_MODE_BAD.png`, `CURRENT_ATLAS_BAD.png`

## Scope Freeze

- No new gameplay features.
- No new professions.
- No new spells unless required to keep existing spell UI display coherent.
- No new regions.
- No multiplayer work.
- No creative reinterpretation of reference layout, target composition, or UX intent.
- No dev or implementation copy in normal player-facing UI.
- No duplicate legacy and React panels for the same visible surface.

## Regression Warning

Any future change that makes the UI closer to `CURRENT_BUILD_MODE_BAD.png` or `CURRENT_ATLAS_BAD.png` is a regression. This includes abstract table-like Build Mode, dev-wiki Profession Atlas, overlapping text, uncontrolled scroll, debug-like player copy, invisible collision, and unreadable dense menus.

## System Audit

| System | Status | Recovery direction | Acceptance gate |
| --- | --- | --- | --- |
| HUD | Acceptable | Keep the REF_133 structure: top-left vitals, top-right minimap, bottom-left chat, bottom hotbar, optional right-side inventory/status. Remove any normal-mode debug copy. | Screenshot proof at 1366x768 and mobile viewport; no hotbar/panel overlap; debug UI absent. |
| Chat | Needs layout rescue | Rebuild toward REF_135 compact player chat: readable history, controlled height, clear tabs/input, no crowding over playfield. | Chat remains usable while moving/typing; no text overlap; no page scroll leakage. |
| Inventory/equipment | Acceptable | Preserve compact right-side inventory/equipment awareness from REF_133 and service screens. Avoid widening into center playfield. | Inventory/equipment panels stay within viewport and do not block hotbar. |
| Spellbook | Needs layout rescue | Use REF_134/REF_139 as strict scroll/readability targets: contained body scroll, clear selected spell, stable footer actions. | Wheel scroll remains inside panel; footer visible; no hidden actions or horizontal overflow. |
| Crafting/smithy | Needs copy/debug purge | Preserve live crafting/service behavior, but align visible copy with REF_137/REF_145_SMITHY production language. | Crafting panel has no implementation/debug labels and remains operable with inventory. |
| Bank | Acceptable | Preserve service-window pairing/stacking and target REF_145_BANK interior/UI composition. | Bank + inventory operate together without window-layer confusion on desktop/mobile. |
| Build mode | Needs full rebuild | Restore spatial Build Mode from REF_136 and REF_145_PLAYER_PLOT_BUILD. Do not repeat CURRENT_BUILD_MODE_BAD's abstract table feel. | Build mode shows real plot context, placement ghost, footprint, materials, and spatial controls without panel duplication. |
| Profession Atlas | Needs full rebuild | Reframe from CURRENT_ATLAS_BAD into REF_138: player-usable profession lenses/pathways, not a dev wiki. | Atlas text stays readable; pathway cards/details are controlled; no overlapping columns. |
| Adventure Map | Acceptable | Preserve compact minimap + expanded Adventure Map split; keep discovery gating and route clarity. | Expanded map has bounded labels; compact minimap remains useful and not duplicated. |
| Tooltips | Acceptable | Keep tooltip stability and viewport clamping; avoid debug tooltip modes in normal play. | Tooltip remains inside viewport and does not remount/flicker during scroll/drag. |
| Minimap | Acceptable | Keep top-right compact minimap with terrain/objective context; do not overfill with text. | Minimap stays legible and does not overlap player vitals or panels. |
| World labels | Needs layout rescue | Keep labels sparse and purposeful: player/NPC/services/objectives only, no label carpet. | Labels do not overlap minimap, right panels, or each other in target scenes. |
| Town | Needs full rebuild | Rebuild Briarbrook town toward REF_142 targets while preserving REF_133 HUD baseline and movement lanes. | Fountain, market, services, NPCs, exits, and paths are readable within 3 seconds. |
| Road | Needs full rebuild | Rebuild Old River Road and road combat/traversal toward REF_140/REF_143_OLD_RIVER_ROAD. | Road edges are readable and traversable; no invisible walls along obvious route lanes. |
| Forest | Needs full rebuild | Rebuild Greymont Forest toward REF_143_GREYMONT_FOREST with stronger silhouettes and harvestable/readable resource nodes. | Forest route and mine/crypt direction are readable; resource feedback is explicit. |
| Crypt | Needs full rebuild | Rebuild Forgotten Crypt toward REF_144 combat/secret targets: darker mood, tactical readability, restrained labels. | Combat and secret-room states are visible without darkness hiding interaction targets. |
| Interiors | Needs full rebuild | Rebuild service interiors toward REF_145_BANK and REF_145_SMITHY with production UI and warm prop composition. | Service prompts, storage/crafting actions, and NPC positions remain predictable. |
| Player plot | Needs full rebuild | Rebuild player plot as spatial homestead/build area per REF_145_PLAYER_PLOT_BUILD and REF_136. | Buildable area, fence/road/water context, placement ghost, and material state are visible. |
| Collision/traversal | Needs full rebuild | Prompt 140 must audit and rebuild collision where player-visible route affordances disagree with movement. | Golden Path route and target screenshots prove no invisible walls in obvious lanes. |

## Removal Or Hiding Rules

- Dev overlay remains dev-only and closed by default.
- Screenshot parity/dev scene controls must never appear in normal play.
- Debug text such as implementation status, preset labels, raw telemetry, and hidden system state is forbidden in player-facing windows.
- Legacy duplicated panels must be hidden or removed once the React-owned surface is accepted.
