# UI Design System

This document defines the shared visual language for Briarbrook's voxel sandbox RPG UI. It is the contract for later HUD, inventory, paperdoll, spellbook, journal, map, accessibility, and release-cut prompts.

## Design Principles

- State must be visible before prose. Health, mana, stamina, target, current action, active tool or weapon, prepared spell, combat mode, and danger state belong on the immediate HUD.
- Recognition beats recall. Use stable icons, slot states, requirement marks, profession colors, and cooldown overlays so players can recognize what is usable.
- Disclose progressively. Show playable state first; reveal details through advanced panels, compare rows, tooltips, Journal/Codex, and planning modes.
- Remove repeated noise. A value repeated across HUD, panel, tooltip, and prompt must have a clear reason on each surface.
- Defaults matter. Windows can be moved and resized, but default layouts must protect the playfield and hotbar.
- Combat protects input. Economy, build, planning, and heavy reading surfaces should compress, pause, or soft-hide when danger is active.

## Design Tokens

### Color Roles

| Token | Value | Use |
| --- | --- | --- |
| `--panel` | rgba(17, 18, 17, 0.91) | Main glass/iron panel fill |
| `--panel-2` | rgba(28, 28, 25, 0.94) | Nested and raised surfaces |
| `--line` | rgba(211, 177, 114, 0.45) | Primary brass border |
| `--line-soft` | rgba(255, 235, 190, 0.16) | Dividers and quiet borders |
| `--gold` | #f0c957 | Selected, active, reward |
| `--blue` | #2479d8 | Mana, magic, info |
| `--green` | #35b75b | Success, valid, healing |
| `--red` | #d62f32 | Damage, invalid, danger |
| `--warning` | #d0a449 | Warning, missing soon |
| `--success` | #70d69a | Success, valid drop |
| `--invalid` | #ff6b5f | Invalid, missing requirement |
| `--cooldown` | rgba(7, 9, 12, 0.74) | Cooldown veil |

### Rarity Colors

| Rarity | Token | Use |
| --- | --- | --- |
| Common | `--rarity-common: #d8d5c9` | Basic tools, common loot |
| Uncommon | `--rarity-uncommon: #70d69a` | Useful uncommon drops |
| Rare | `--rarity-rare: #6fd4ff` | Rare magic/material drops |
| Epic | `--rarity-epic: #b58cff` | High-tier magical gear |
| Legendary | `--rarity-legendary: #f0c957` | Signature artifacts |

### Skill Group Colors

| Group | Token | Use |
| --- | --- | --- |
| Combat | `--skill-combat: #d66a55` | Attack, defense, weapon skills |
| Magic | `--skill-magic: #6fd4ff` | Spells, reagents, meditation |
| Crafting | `--skill-crafting: #d0a449` | Recipe, station, repair |
| Wilderness | `--skill-wilderness: #70d69a` | Gathering, tracking, fishing |
| Social | `--skill-social: #c184ff` | Trade, rumors, persuasion |
| Utility | `--skill-utility: #d8d5c9` | Lockpick, detect, movement support |

### Profession Colors

Professions should keep the existing Atlas `--profession` rail and reuse it in skill rows, tooltips, milestones, and related action buttons. If a profession has no custom color, use the nearest skill group token and keep the border rail visible.

### State Tokens

| State | Visual Rule |
| --- | --- |
| Normal | Brass border, dark panel fill, no glow |
| Hover | Border brightens and background lifts one step |
| Focus | 2px gold outline outside the component; never rely on color alone |
| Pressed | Inset shadow and 1px downward transform when motion is allowed |
| Disabled | 55% opacity, muted text, no hover lift |
| Selected | Gold rail or ring plus slightly raised fill |
| Active | Gold fill/ring plus persistent activity marker |
| Invalid | Red border, exclamation marker, tooltip reason |
| Warning | Amber border, requirement text/icon, no destructive color |
| Success/Valid | Green border or drop ring |
| Cooldown | Dark radial/vertical veil with remaining time if readable |
| Missing Requirement | Red or amber requirement chip with missing icon/count |

### Sizing And Spacing

| Token | Value | Use |
| --- | --- | --- |
| `--space-1` | 4px | Tight icon/text gaps |
| `--space-2` | 6px | Compact panel gaps |
| `--space-3` | 8px | Default internal spacing |
| `--space-4` | 12px | Panel padding |
| `--space-5` | 16px | Larger section rhythm |
| `--target-compact` | 32px | Small header controls |
| `--target-default` | 44px | Slots and primary touch targets |
| `--target-large` | 52px | Mobile or high-value actions |
| `--icon-sm` | 18px | Text-adjacent icons |
| `--icon-md` | 28px | Buttons and chips |
| `--icon-lg` | 44px | Item, spell, paperdoll slots |

### Typography

| Token | Value | Use |
| --- | --- | --- |
| `--font-xs` | 10px | Micro labels and counters |
| `--font-sm` | 12px | Secondary slot text |
| `--font-md` | 14px | Dense body text |
| `--font-lg` | 18px | Window headers |
| `--font-xl` | 22px | Modal or mode title |

Letter spacing stays at `0`. Do not scale font size directly with viewport width.

## Z-Index Layers

| Layer | Range | Surfaces |
| --- | --- | --- |
| Canvas | 0 | World render |
| World labels | 20-39 | Nameplates, floating text |
| Persistent HUD | 40-89 | Status, target, minimap, guide, quest chip |
| Managed windows | 100-999 | Inventory, Journal, Spellbook, Skills, Crafting |
| Modals | 1000-1499 | Trade, Merchant, Help/Pause |
| Drag/drop | 1500-1699 | Drag ghost, drop status |
| Tooltip | 1700-1899 | Tooltips and debug tooltip overlay |
| Critical overlay | 1900+ | Fade, damage overlay, blocking release dialog |

## Animation Timings

| Token | Value | Use |
| --- | --- | --- |
| `--motion-fast` | 90ms | Press/hover |
| `--motion-base` | 140ms | Panel affordance change |
| `--motion-slow` | 220ms | Modal/fade changes |
| `--tooltip-delay` | 240ms | Standard tooltip reveal |
| `--tooltip-long-delay` | 520ms | Dense/advanced tooltip reveal |

Reduced motion disables nonessential animation and keeps state changes instantaneous.

## UI Modes

### Exploration HUD

- Visible: status cluster, hotbar, minimap, Guide/next-step chip, prompt, current target when selected.
- Optional: inventory compact, spellbook compact, journal route tab.
- Hidden: market/crafting/build/atlas unless opened intentionally.
- Primary actions: move, interact, gather, talk, inspect, assign/use hotbar.
- Input focus: gameplay owns keyboard unless a text field or managed window interaction is active.

### Combat HUD

- Visible: HP/mana/stamina, active target, hotbar/cooldowns, combat actions compact, danger chip, action progress.
- Optional: inventory quick-use, spell detail for prepared spell.
- Hidden or soft-blocked: market, bank, crafting, build, full atlas, long journal reading.
- Primary actions: attack, defend, cast, use bandage/potion, move/cancel approach, retarget.
- Input focus: combat hotkeys remain live; text input requires explicit focus.

### Crafting/Market Mode

- Visible: inventory, crafting or market panel, cost/requirement rows, pack weight.
- Optional: bank/storage, recipe detail, work-order list.
- Hidden: combat-only action panels unless danger is active.
- Primary actions: select recipe/order, inspect requirements, craft/sell/buy/move items.
- Input focus: panel controls own pointer; digit hotkeys should not fire in search fields.

### Build Mode

- Visible: build panel, selected piece, placement validity, material costs, rotate/cancel controls.
- Optional: storage compact and crafting station shortcuts.
- Hidden: full market, full atlas, full journal.
- Primary actions: choose piece, place, rotate, snap, move last, undo, deposit housing materials.
- Input focus: placement pointer actions own the world; invalid placement uses persistent visual state plus prompt reason.

### Journal/Planning Mode

- Visible: Journal/Codex, route goals, known discoveries, current quest context.
- Optional: map, profession atlas, skill detail.
- Hidden: market/build/crafting unless linked from planning.
- Primary actions: filter, pin objective, inspect knowledge, compare plans.
- Input focus: reading panels own scroll/search; gameplay input is quiet while text fields are active.

## Component State Rules

## Item State Model

Item, equipment, and hotbar visuals use one shared state vocabulary:

- Equipped: the item is in a paperdoll/equipment slot and receives an `E` badge.
- Assigned: a hotbar slot points at the item, tool, spell, skill, or action and receives an `H` badge.
- Active: the selected hotbar slot or hand state receives the hand/active badge and gold treatment.
- Held/In hand: the weapon paperdoll slot is highlighted as the current hand state until a later paperdoll attachment pass replaces it with model attachments.
- Damaged/Broken: durability below 55% is worn, below 25% is damaged, and zero is broken.
- Missing requirement: hotbar or slot state gets a red marker and keeps the reason in tooltip/prompt.
- Quantity: stack count remains visible but should not cover state badges.
- Exceptional: quality/exceptional items use the rarity badge.

Inventory, equipment, and hotbar badges are intentionally short. Long explanations belong in tooltips or comparison panels.

### Button

Normal uses panel fill and brass border. Hover brightens border. Focus shows a visible gold outline. Pressed uses inset depth. Disabled is muted and non-hovering. Selected/active uses gold rail or ring. Invalid/warning/success use the state token border plus tooltip reason.

### Item Slot

Show item icon first, quantity second, state marker third. Selected uses gold ring and stable size. Drag source uses lifted outline. Valid drop uses green ring; invalid drop uses red ring and prompt reason. Missing item uses muted empty slot, not blank text.

### Equipment Slot

Paperdoll slots must show body-region silhouette, equipped icon, durability severity, and invalid-fit state. Empty slots use body-region iconography rather than text alone.

### Hotbar Slot

Priority order: icon, key number, cooldown veil, invalid marker, count/cost. Active slot uses gold ring. Invalid hotbar actions show a marker and keep the reason in tooltip. Cooldown should not shift layout.

### Spell Card

Known/unknown/usable/missing-reagent states must differ by icon opacity, border state, and requirement row. Circle and mana are secondary. Prepared spell uses active state.

### Skill Row

Use skill group color rail, current value, recent gain marker, profession relevance, and trainable/locked state. Avoid long descriptions in the row; move them to tooltip/detail.

### Tooltip

Tooltips explain requirement, consequence, comparison, or reason. They should not repeat only the visible label. Delay is 240ms by default and longer for dense advanced surfaces.

### Window Header

Header contains title, compact/advanced toggle where relevant, and close control. Drag affordance belongs to the header background/cursor. Controls stay at least 32px hit area when possible.

### Context Prompt

Prompt text is short and action-oriented. Valid action prompt uses neutral/gold. Warning/invalid prompt uses amber/red and should name the missing requirement.

### Progress Bar

Bars use fill direction and label. HP/mana/stamina keep stable colors. Action progress should be visible without opening a panel and never resize during a cast/gather action.

### Status Chip

Chips are for current state, not long explanations. Danger, hidden, poisoned, bandaging, defending, queued, and overburdened should be chip states with tooltip detail.

### Modal

Modal windows sit above managed windows, trap pointer intent visually, and keep the close/confirm/cancel actions reachable. They should not obscure the hotbar unless the game is paused or interaction is blocking.

### Toast/Floating Text

Floating text is for state change, reward, damage, and failure. Repeated system explanation belongs in Journal/Codex or tooltip, not repeated toasts.

## Implementation Notes

- Keep `src/styles.css` as the runtime CSS token source until a dedicated token module is needed.
- Keep `WindowManager` as the source for window clamping, drag, z-order, scroll preservation, and layout reset.
- Use `UI_AUDIT.md` as the backlog for later prompt refactors. Do not inflate persistent HUD density to satisfy a single panel's needs.
