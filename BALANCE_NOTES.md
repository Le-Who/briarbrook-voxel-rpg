# Systems Balance Pass

## First-hour measurement surface

- Dev overlay now has a `First Hour Balance` block with elapsed minutes, total skill gain rate, net gold, resource inflow/outflow, damage dealt/taken, bandage use, repair count, and simple spell experiment capacity.
- Telemetry remains the source of truth for skill gains, gold earned/spent, gathered resources, consumed resources, damage, potion use, bandages, repairs, market activity, work orders, and deaths.

## Tuned constraints

- Direct tree interaction now yields `logs`, matching the first road quest, board recipe, market buy order, and first-hour director route.
- Common tree yields were reduced from bulk `wood` to modest `logs` so one tree harvest completes the starter log check with the initial kit without flooding the economy.
- Axe, pickaxe, fishing pole, and shovel now have finite durability budgets. They matter as item sinks, but the first-hour values are high enough that normal tutorial gathering should not break the route.
- Tier 1 work orders now cap raw gold at 150g and several pay useful side rewards such as crate kits, mana potions, trail rations, bandages, wood, and gears.
- Brom's higher tier ingot order now pays less raw gold and adds a repair kit, keeping repairs visible without bankrupting the player.

## Current acceptance intent

- Gathering should resolve in seconds and visibly move resource/skill telemetry.
- Reagents should constrain repeated casting while still allowing starter experimentation with Magic Arrow, Heal, and Night Sight.
- Repairs should consume profession materials and appear in telemetry without forcing a player into early bankruptcy.
- Work orders should connect crafting output to practical income and replacement supplies rather than acting as raw gold faucets.
