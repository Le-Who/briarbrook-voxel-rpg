# UI Audit

This audit covers the current browser RPG UI after the managed-window, hotbar, input, tooltip, profession, and save/load hardening passes. It is intentionally practical: it identifies where the current UI is already serviceable, where it is dense, and which surfaces should be refactored in later prompt passes.

## Information Hierarchy

### Appears Too Often

- Basic location/progression text appears in multiple places: Guide, Journal, prompt line, chat/rumors, and sometimes world labels. Keep Guide as the first-session route and move deep explanation to Journal.
- Skill and profession context repeats across Skills, Profession Atlas, Guide steps, tooltips, and prompts. Use color, icon, and compact status chips for repeated skill group meaning instead of full prose.
- Item usability is repeated in inventory slot titles, action buttons, hotbar invalid labels, and prompts. Hotbar and inventory should share one visual invalid/missing requirement language.
- Combat intent is present in settings, target state, prompts, and action bars. The persistent HUD should own current combat mode and danger; prompts should only describe changes or failures.
- Window controls repeat without hierarchy. Every panel has close controls, but only Help exposes reset layout and settings. Layout actions should remain in Help/settings rather than copied into every header.

### Hidden Too Deeply

- Active tool/weapon and active spell are not obvious unless the player reads the hotbar contents and the selected spell detail. Add a compact "active hand / prepared spell" readout near the primary HUD.
- Reagent shortage is visible on a hotbar slot as invalid text but should also be recognizable on spell cards and spell detail through a missing-requirement color/icon.
- Encumbrance and inventory capacity exist in Inventory footer and weight math but are not prominent before actions fail. Inventory should show pack state as a small meter.
- Equipment durability/repair state is mostly detail text. Paperdoll/equipment slots need wear severity visuals.
- Market/work-order readiness depends on text and button enablement. Work orders need visible "ready / missing / risk" states.
- Build mode placement validity appears as help text and prompt feedback. The build panel should show placement state with a persistent valid/invalid chip.

### Repeated UI Work

- Slot grids are implemented in inventory, bank, trade, storage, equipment, and hotbar with similar selected/invalid/drop states but inconsistent labels.
- Tab controls appear in Journal, Spellbook, Skills, Crafting, Build, and Chat with similar active state but different density.
- Cost rows appear in Build, Crafting, Market, and Spellbook. They should share the same missing/available visual rule.
- Header layout and close controls are repeated manually; managed windows should keep a shared header contract.
- Tooltip content often duplicates visible text. Tooltips should add reason, requirement, comparison, or consequence, not restate the label.

### Text Doing Visual Work

- "Missing reagents", "No mana", "Not in pack", and build/craft cost failures are mostly text. Use warning/invalid tokens, small requirement icons, and a consistent exclamation marker.
- Danger state is mostly world-label/prompt language. Use target frame accent, HUD danger chip, and combat border tone.
- Skill group and profession identity are mostly names. Profession colors already exist in Atlas; extend them to skill rows, tooltips, and related actions.
- Active/selected state is often only an `active` or `selected` class with border color. Add shape and contrast differences so color is not the only cue.
- Cooldowns are visual in hotbar slots but not consistently described in other action surfaces.

### Ambiguous Visual State

- Selected inventory item versus drag source versus valid drop target can look similar under fast interaction.
- Spell known/unknown/usable/missing-reagent states are visually close in dense spellbook modes.
- Skills that are relevant, recently gained, trainable, or profession-critical need clearer visual separation.
- Combat mode settings use text buttons without a persistent HUD echo.
- Build piece selected, move mode, invalid placement, and missing materials overlap in panel text.
- Chat tabs and rumors have active styling but low priority relative to gameplay.

### Controls Too Small

- Header close buttons are compact at 24px. They should remain at least 28px visual size and 32px hit area where viewport allows.
- Inventory/bank/storage slots are dense. Keep 44px as the preferred desktop slot target and never below 36px on compact layouts.
- Hotbar slot labels can crowd icons. Preserve the icon/cooldown area first; push text to tooltip or secondary line.
- Spellbook tab/filter buttons become cramped in narrow viewports.
- Profession filter buttons are usable but need stable line wrapping and a clear selected rail.

## Combat Availability

### Should Stay Available In Combat

- Player status cluster: HP, mana, stamina, active flags, danger state.
- Current target and target health.
- Hotbar and cooldown feedback.
- Combat Actions panel in compact form.
- Inventory in compact quick-use mode for bandages, potions, and equipped tool checks.
- Context prompt, action progress, floating text, and danger labels.
- Chat input should remain available only when explicitly focused; it should not steal combat input by default.

### Should Be Soft-Hidden Or Compressed In Combat

- Guide and Quest tracker: compress to one current objective chip.
- Journal: keep accessible but not default-expanded.
- Spellbook: allow selected spell/detail only; full browsing should be secondary.
- Skills/Profession Atlas: hide full atlas, allow compact recent-gain/status chip.
- Market, bank, trade, merchant, and crafting: close or dim unless already in a safe interaction state.
- Build mode: combat should cancel or block placement unless a future mode explicitly supports danger building.
- Help/settings: pause-first access, not live combat overlay.

## Compact And Advanced Modes

- Inventory needs compact mode for quick-use/equip and advanced mode for sorting, split, compare, trade, bank, and storage routing.
- Character/Paperdoll needs compact mode for equipped silhouette and warnings, advanced mode for derived stats, resists, durability, and comparison.
- Spellbook needs compact mode for prepared/known/usable spells, advanced mode for circles, reagents, study, search, and unknown spells.
- Skills/Profession Atlas needs compact mode for tracked skills/recent gains, advanced mode for profession graph, milestones, and mastery.
- Journal needs compact route mode and advanced codex/planning mode.
- Market/Crafting/Build need task-focused mode first, economic/recipe/layout details second.
- Help/settings should own layout reset, UI scale, reduced motion, and input explanations.

## Refactor Targets

1. Extract shared state tokens for normal, hover, focus, pressed, disabled, selected, active, invalid, warning, cooldown, and missing requirement.
2. Give major windows a compact/advanced toggle where the current density blocks first-read comprehension.
3. Add icon-backed requirement rows for costs, reagents, durability, weight, and danger.
4. Move repeated prose into tooltips, Journal, or Codex entries; keep active HUD language short.
5. Keep combat-safe UI surfaces small and block economy/build/planning surfaces during danger.
6. Preserve managed-window drag, scroll, z-index, and reset behavior as the non-negotiable layout contract.
7. Verify every major panel at 1366x768, 520x720, and UI scale 80/100/110 before calling a UI pass complete.

## Release Risk

- The game has enough systems that adding more always-visible UI will make it less playable. Prefer visual compression and progressive disclosure.
- Full browser-level scrollbars and layout jumps are now regression-class issues. Any future string-rendered UI change must preserve scroll and drag state.
- Do not solve density by hiding critical state. HP/mana/stamina, target, current action, active tool/spell, combat mode, and danger must remain visible without deep menus.
