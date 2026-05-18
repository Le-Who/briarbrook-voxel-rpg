# First Hour Notes

## Scope

This pass connects the existing tutorial quests, telemetry, skills, economy, magic, combat, secrets, and housing into one visible first-hour route. It does not add a second scripted tutorial path; the Journal now derives first-hour progress from real `GameState` data.

## Route Now Tracked

The Journal `First Hour Route` section tracks these milestones:

- talk to Mira at the fountain
- open inventory and inspect the starting kit
- open skills and watch use-based gains
- use an axe on a tree
- use a pickaxe on a mine rock
- bank or sell one gathered resource
- cast Magic Arrow
- cast Heal
- use a bandage, potion, or heal under pressure
- fight a road enemy
- enter the forest or mine route
- enter the crypt
- reveal, unlock, or open an interesting object
- complete one work order
- visit the housing plot
- place one housing object

## Skill Coverage

The first-hour target is 12 meaningfully touched skills. Journal now displays:

- total touched skills against the 12-skill target
- recent skill events from telemetry and skill last-use state
- suggested missing first-hour skills when no events have occurred yet

Recommended first-hour skill coverage is:

- Lumberjacking
- Mining
- Healing
- Anatomy
- Magery
- Meditation
- Swordsmanship
- Tactics
- Archery
- Peacemaking
- Lockpicking
- Carpentry

The Skills panel already marks skills that are not trainable in this slice as `Not yet trainable`, so the broader skill list can stay visible without implying every skill is currently usable.

## Friction Removed

- The Journal now gives one next suggested step, system coverage, skill events, discoveries, route progress, and the first visible milestones in one place.
- The Guide now includes the missing pickaxe step before the economy and magic loop can take over.
- The Market quick button stays hidden on a fresh save, then unlocks after the player produces tradable goods, completes the road prep, reaches the road, or touches the economy.

## Fresh-Save Audit Notes

The connected first-hour arc now covers movement, skills, tools, magic, combat, healing, economy, secrets, and housing without requiring the dev overlay. The strongest player-facing anchors are Mira's first quest, the Guide panel, Journal route, hotbar tools/spells/items, and the market/work-order feedback loop.

Weak spots still worth watching during a full 45-60 minute manual playthrough:

- Inventory-open history is inferred from the panel being open or later inventory/economy use. There is no persistent "opened inventory once" telemetry event yet.
- The first-hour route can identify combat and healing coverage from objective/telemetry signals, but exact player intent during messy fights still depends on the combat telemetry quality.
- Work order completion is tracked cleanly, but crafting station discoverability should be rechecked after future map-density changes.
- The route is intentionally compact in Journal; if later content expands, the section should keep showing only the next few milestones rather than becoming another quest log.
