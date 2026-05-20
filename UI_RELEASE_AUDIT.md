# UI Release Audit

This is the release-cut inventory for the current Briarbrook UI. The goal is a calmer first playable experience: visible surfaces must support the first hour, advanced systems stay reachable, and dev-only controls stay out of normal play.

## Visible UI Inventory

| Surface | Purpose | First-Hour Relevance | Current Quality | Decision |
| --- | --- | --- | --- | --- |
| HUD player status | Show health, mana, stamina, active weapon, prepared spell, combat mode, and flags. | Critical | Good after loadout chips; important state is visual. | Keep |
| Status panel | Raw time, phase, events, attributes, weight. | Low | Useful but mostly diagnostic/detail. | Hide by default |
| Hotbar | Primary action execution, active slot, item/spell/tool state, cooldowns, quantity, equipped/assigned badges. | Critical | Good; state badges are visible, dense but playable. | Keep |
| Minimap | Orientation, nearby target hints, risk/status, travel/dev travel when enabled. | High | Good; compact and always useful. | Keep |
| Chat | System/local feedback and world flavor. | Medium | Useful but can become noisy tutorial fallback. | Keep, moderate cadence |
| Inventory | Pack contents, equip/use/split/bank/sell/offer, compact item state language. | Critical | Good compact default; selected item actions appear only when needed. | Keep |
| Equipment / paperdoll | Equipped weapon, armor, shield, backpack, visual attachments, durability. | High | Good; paperdoll and HUD both show equipment state. | Keep |
| Spellbook | Known spell browsing, prepared spell detail, reagents, hotbar assignment. | High | Good in Known default; Unknown/All are advanced planning views. | Keep Known default |
| Skills | Skill ledger, profession filters, trainable/recent states. | Medium | Strong but dense. | Keep accessible, not default-open |
| Profession atlas | Long-term build planning and skill relationships. | Low in first 10 minutes, medium later | Useful but advanced and dense. | Hide by default |
| Journal | Current objectives, rumors, skill/spell/location knowledge, work-order route. | High | Good, but tab density remains. | Keep |
| Market | Work orders, buying/selling, demand and reward loops. | Medium | Work-order mode is a good default; discovery should stay contextual. | Keep contextual |
| Crafting | Recipe and station work. | Medium after first gathering | Useful but detailed. | Keep accessible, not default-open |
| Bank | Storage and weight relief. | Medium | Clear when at bank. | Keep contextual |
| Housing / Build | Plot placement, storage, station/decor progression. | Low until plot unlocked | Good but prerequisite-heavy. | Hide until housing/build context |
| Help | Pause/help, layout reset, presets, accessibility, keybindings. | High as recovery surface | Useful but long. | Keep, not default-open |
| Settings | UI scale, font, tooltip, motion, color, chat, layout lock, camera smoothing. | Medium | Consolidated inside Help; no separate duplicate panel. | Keep in Help |
| Dev overlay | Runtime, validation, telemetry, debug spawning, scene tools. | None for release player | Complete and noisy. | Dev-only |

## Cut Rules Applied

- Dev overlay remains off by default and is only reachable by debug binding.
- Status panel remains hidden by default because raw attributes/time duplicate HUD/minimap needs.
- Profession atlas, full crafting, market, build, treasure, bank, trade, merchant, and combat actions are not default-open.
- Spellbook starts in Known view; All/Unknown stay available for advanced planning but do not lead the first read.
- Inventory stays compact: slot grid, concise badges, footer weight/gold, selected-item actions only after selection.
- Layout reset, keybindings, accessibility, and UI presets remain consolidated in Help instead of duplicated across window headers.
- Ambient chat cadence is slowed to avoid local chatter crowding the first-hour guidance.

## Release Defaults

| Default | Value | Source / Notes |
| --- | --- | --- |
| Layout preset | `default` | Protects player HUD, minimap, guide, chat, and hotbar. |
| UI scale | `100%` | `state.ui.uiScale = 1`. |
| Font scale | `100%` | `state.ui.fontScale = 1`. |
| Tooltips | Compact | Advanced content remains behind `shift`/advanced mode. |
| Spellbook | Known, grid | Unknown spell clutter is hidden until the player asks for it. |
| Inventory | Compact slot/action mode | Advanced compare appears only when selecting equipment. |
| Auto-approach | Assist | Keeps manual control while helping range-limited actions. |
| Debug overlay | Off | Release player sees no dev surfaces. |
| Chat tabs | On | Can be hidden from Help; ambient cadence is moderate. |
| Guide | On | First-hour route remains visible. |
| Market | Work-order mode | Opens to the most understandable economy task. |

## Final UI QA

| Check | Status | Evidence / Follow-up |
| --- | --- | --- |
| No flickering tooltips | Pass with caveat | HUD replacement is deferred during edit, drag, and scroll; context-menu focus is restored across remounts. Continue watching full HUD remount frequency. |
| Windows do not block hotbar permanently | Pass | `WindowManager` clamps windows above hotbar safe area and reset layout is available. |
| Equipment states are visible | Pass | HUD loadout, inventory badges, equipment slots, and paperdoll attachments show weapon/armor/backpack/shield state. |
| Active tool/weapon/spell visible | Pass | HUD loadout and hotbar active slot show active weapon/spell/action state. |
| Character visual updates on equipment/use | Pass | Player attachments resolve from equipped item prefabs and browser smoke confirmed visible paperdoll gear in the previous pass. |
| Panels close with Esc/X | Pass | Escape cancels drag/context/selection or closes topmost windows; focused text fields blur first. X close buttons remain on managed windows. |
| Reset UI works | Pass | Help exposes Reset Layout; `WindowManager` clears saved layout and redecorates. |
| Save/load preserves layout | Pass | Save/load regression coverage preserves `windowLayouts` and strips transient UI state. |
| Debug controls hidden | Pass | Dev overlay is false by default and sanitized out of saves. |
| Chat rumors moderate | Pass | Ambient chat now uses a 24 second cadence instead of the earlier faster cadence. |

## Release-Cut Decisions

Keep for release candidate:

- Player status, target frame, minimap, hotbar, guide, chat, prompt, action progress.
- Inventory, Character/equipment, Spellbook Known mode, Skills ledger, Journal, Market work orders.
- Context menu, drag/drop, hotbar assignment, Help/settings/keybindings.

Hide by default but keep accessible:

- Profession atlas, Crafting, Build, Bank, Treasure Map, Combat Actions, Market trade/all views, Spellbook All/Unknown views.

Dev-only:

- Dev overlay, scene teleport, spawn tools, validation details, telemetry export, resource reset, facing debug.

Cut or defer from first-hour defaults:

- Any always-visible raw stat panel.
- Any duplicate layout/settings controls outside Help.
- Any unknown-spell-first presentation.
- Any debug/noisy telemetry indicator in normal HUD.

## Remaining Release Risks

1. Help is now the correct home for recovery controls and is sectioned into first-hour, spell/tool/housing, panel, and current-UI groups. A future polish pass should split it only if settings grow a dedicated persisted route.
2. Tool targeting and housing prerequisites now have explicit Help rows; the remaining proof gap is the no-dev Golden Path route through housing, not basic Help comprehension copy.
3. Full HUD string remounting is guarded for user interactions, but a future architecture pass should split high-frequency HUD regions from stable windows.
