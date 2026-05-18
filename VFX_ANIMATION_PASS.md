# VFX And Procedural Animation Pass

Prompt 70 adds a restrained effect language for combat, magic, gathering, and short interaction gestures. Effects are transient simulation events in `state.visualEffects`; they are not saved, and they are capped by tier before the renderer sees them.

## Effect Budget

| Tier | Use | Active budget |
| --- | --- | --- |
| 0 | UI-only state change | Not rendered |
| 1 | Small particles, sparks, outlines, hit/miss cues | 24 |
| 2 | Projectiles and short area effects | 12 |
| 3 | Boss or event-scale effects only | 2 |

Normal combat, magic, and gathering use Tier 1 or Tier 2. The global transient cap is 34 effects. Reduced-motion mode shortens Tier 2+ effects.

## Visual Language

Combat:
- Sword and axe attacks use a facing-aligned slash arc.
- Fencing uses a forward thrust line.
- Mace and staff hits add a blunt impact puff.
- Shield/parry/guard uses a blue shield flash.
- Miss and dodge use small ground cues.
- Critical hits add a gold burst.
- Armored targets add small gold armor sparks instead of a blood effect.

Magic:
- Damage keeps projectile/impact language.
- Healing uses upward soft particles.
- Buffs use a ring/glow around the target.
- Debuffs use a colored mark.
- Utility spells use a line or object highlight.
- Reveal uses an expanding pulse.
- Recall/mark uses a rune circle.
- Fizzle uses a short collapse/smoke cue.

Gathering:
- Chopping emits wood chips.
- Mining emits ore sparks/debris.
- Fishing emits water ripples.
- Herbs sparkle only on successful harvest.
- Depleted resources use a subtle ground cue.

Procedural animation:
- Held tools swing on the active frame of gathering.
- Bows draw during attack wind-up.
- Casting gear scales with cast wind-up.
- Shields pulse while guarding/blocking.
- Pickup, door/interact, and crafting gestures are short Tier 1 events.

## Runtime Sources

- `src/systems/VfxSystem.ts`: tier budgets, caps, and queue helpers.
- `src/render/VoxelRenderer.ts`: renderer primitives for each effect kind.
- `src/systems/CombatSystem.ts`: confirmed hit, miss, block, dodge, crit, and armor impact timing.
- `src/systems/SpellSystem.ts`: spell-role effect mapping after cast resolution.
- `src/systems/ResourceSystem.ts` and `src/systems/InteractionSystem.ts`: gathering result effects.
- `src/systems/CraftingSystem.ts`: station working loop cue.
