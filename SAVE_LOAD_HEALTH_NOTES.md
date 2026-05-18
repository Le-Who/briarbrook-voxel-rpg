# Save Load And Build Health

## Save Contract

- Current save version is `3`.
- Saves are schema-checked before migration. Invalid envelopes fall back to a fresh state instead of crashing load.
- Save payloads keep durable player, inventory, equipment, bank, spells, hotbar, quest, world, housing, resource, chest, economy, telemetry, and window layout state.
- Save payloads strip transient hover/targeting/context menu state, pending approach actions, target positions, movement intents/paths, action state, render stats, debug overlay, debug facing flags, floating texts, projectiles, gathering, bandage, and active spell-cast state.

## Migration Defaults

- Legacy saves get current spellbook defaults, telemetry defaults, current resource definitions, housing storage normalization, and old skill aliases such as `Magic` to `Magery`.
- Resource node migration rewrites saved resource entities from the current resource definitions so older saves inherit corrected tree log yields.

## QA Coverage

- Save/load regression tests cover durable UI/player state, transient stripping, old-save migration, forest resources, crypt chest state, housing placement/storage, and windows open during save.
- Telemetry health tests cover skill attempts, action cancellation reasons, transition fallback counts, UI reset usage, first-hour path completion, and dev overlay friction reporting.
- `npm run build:health` runs the full Vitest suite and production build as a single local health gate.
