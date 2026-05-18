# Reactive UI State Architecture

Prompt 71 hardens the rule that panels render from state, not DOM-owned gameplay truth.

## State Separation

- `GameState`: authoritative gameplay truth: player, inventory, equipment, skills, spells, world, combat, quests, economy.
- `UIState`: visual UI preferences and selections: panels, window layouts, selected/hovered targets, active hotbar slot, tooltip preferences, keybinding capture.
- `RenderState`: transient interpolation/effects: `visualEffects`, `projectiles`, `floatingTexts`, action timing and render stats. It is cleared/sanitized on save/load.
- `DevState`: debug-only controls and QA counters.

DOM state may hold pointer capture, currently focused element, and temporary drag ghosts, but not inventory/equipment/spell/hotbar truth.

## Selector Layer

`src/game/UIStateSelectors.ts` centralizes repeated visual questions:

- `getEquippedItems(player)`
- `getActiveHotbarSlot(player, uiState)`
- `getHeldVisualItem(player)`
- `getItemUseState(state, itemInstanceId)`
- `getSpellCastability(state, spellId)`
- `getTooltipContent(state, anchorId)`
- `getWindowLayout(state, windowId)`
- `getInteractPrompt(state, target)`
- `sanitizeUiStateReferences(state)`
- `validateUiConsistency(state)`

Panels should ask these selectors for visual state instead of duplicating inventory, spellbook, equipment, or hotbar truth.

## Event Flow

Input is handled as:

`InputAction -> GameAction command -> Simulation -> GameState/UIState mutation -> sanitizeUiStateReferences -> selectors -> renderer/UI`

UI panels dispatch commands. They do not directly mutate inventory slots, equipped gear, spells, skills, or hotbar data.

## Stale State Prevention

`sanitizeUiStateReferences` is run after command dispatch and fixed simulation ticks. It:

- clamps active hotbar slot;
- clears missing hotbar definitions while preserving valid item assignments even when quantity is zero;
- clears stale spell assignment capture;
- clears invalid inventory/bank selections;
- clears hover, selected target, and context menu targets that no longer exist or are outside the current area;
- clamps stored managed window layouts into the viewport.

Area transitions still explicitly clear hover/targeting/context menu state at the transition boundary.

## Consistency Gate

`validateUiConsistency` returns dev/test issues for:

- invalid hotbar item/spell/skill/action definitions;
- stale hover or selected targets;
- out-of-viewport managed window layouts;
- equipped stacks that cannot be resolved by item instance id.
