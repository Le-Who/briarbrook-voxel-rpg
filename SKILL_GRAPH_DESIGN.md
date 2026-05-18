# Skill Graph Design

This system keeps the game faithful to UO-style use-based growth: skills rise because the player practices them. The UI adds clarity around what those skills mean, where they connect, and what long-term goals exist, but it does not add a level-up point-spend tree.

## Current Layers

### Skill Ledger

The Skill Ledger is the authoritative skill view. It renders every defined skill with:

- Display name and group.
- Current effective value.
- Real value when bonuses are active.
- Bonus-aware value display.
- Raise, Lock, and Lower mode control.
- Cap progress and gain progress bars.
- Recent gain and build-relevance status.
- Drag source support for hotbar-compatible skills.
- Tooltips for description, training verbs, profession use, support role, stats, milestones, roles, and trainability.

Ledger filters:

- All
- Combat
- Magic
- Crafting
- Wilderness
- Subterfuge
- Social/Barding
- Trainable now
- Recently gained
- Locked
- Build-relevant

### Profession Atlas

The Profession Atlas is a clarity layer, not the source of progression. It presents focused profession constellations instead of one giant passive tree.

Each cluster contains nodes for skills, actions, tools, stations, spells, recipes, milestones, and profession goals. Edges describe relationships such as trains, requires, supports, unlocks, improves, consumes, and produces.

Interactions:

- Skill nodes focus that skill in the Ledger.
- Spell nodes open the Spellbook and select the spell.
- Recipe nodes open Crafting and select the recipe.
- Action, tool, station, goal, and milestone nodes explain how to pursue the activity.
- Profession goals can be pinned into the Journal.
- Recently used or relevant player paths are highlighted.
- Zoom controls support dense clusters.

### Mastery Milestones

Mastery Milestones are the reward layer. They are earned from skill values, quests, discoveries, crafted recipes, work orders, housing placement, owned items, known spells, and dungeon secrets. They grant clarity, recipes, utility, active interactions, or quality-of-life improvements.

Milestones do not grant broad passive stat inflation and do not replace skill practice.

## Profession Clusters

Implemented clusters:

- Armsman: melee, tactics, anatomy, parry, repair readiness.
- Ranger: archery, tracking, lumber, arrows, forest scouting.
- Hedge Mage: magery, meditation, reagents, utility spells, spellbook planning.
- Treasure Hunter: cartography, hidden detection, lockpicking, traps, map caches.
- Smith/Artisan: mining, forge use, repairs, work orders, maker identity.
- Builder: lumber, carpentry, workbench, storage, housing persistence.
- Healer: bandages, anatomy, alchemy, cure, recovery clarity.
- Bard: musicianship, peacemaking, provocation, crowd control, social pressure.
- Rogue: hiding, stealth, lockpicking, remove trap, risk-managed loot.
- Naturalist/Tamer: fishing, herbs, animals, future taming and veterinary play.

## Mastery Milestones

The initial set includes at least twelve goals across the profession surface:

- Road Duelist
- Greymont Scout
- Hedge Mage
- Treasure Hunter Initiate
- Briarbrook Artisan
- Plot Steward
- Field Medic
- Road Performer
- Careful Hands
- Trail Naturalist
- Crypt Caution
- Market Helper

These are data-driven definitions in `src/data/professions.ts`. Each definition declares requirements, visibility requirements, reward type, reward text, and unlock message.

## Trainable Now

Trainable skills currently represented as active or directly practiceable include:

- Combat: Swordsmanship, Fencing, Mace Fighting, Archery, Wrestling, Tactics, Anatomy, Parrying, Healing, Focus.
- Magic: Magery, Evaluating Intelligence, Meditation, Resisting Spells.
- Crafting: Alchemy, Blacksmithing, Carpentry, Bowcraft/Fletching, Tailoring, Tinkering, Inscription, Cooking, Cartography, Arms Lore, Item Identification.
- Wilderness: Lumberjacking, Mining, Fishing.
- Subterfuge: Hiding, Stealth, Lockpicking, Detect Hidden, Remove Trap, Poisoning.
- Social/Barding: Musicianship, Peacemaking, Provocation, Discordance.

Trainability is intentionally surfaced as a UI status because not every classic sandbox skill has a full gameplay loop yet.

## Passive And Support Skills

Some skills primarily support other actions today rather than having a standalone loop. Examples include Tactics, Anatomy, Focus, Resisting Spells, Arms Lore, Item Identification, Evaluating Intelligence, and Camping.

The Ledger labels these as support or future where appropriate, while the Atlas shows what systems they influence. This avoids presenting support skills as broken just because they are not clicked directly.

## Future Skills And Extensions

Future-facing or incomplete loops should stay visible, but clearly described:

- Taming and Veterinary for Naturalist/Tamer.
- More complete trap and dungeon secret chains for Rogue and Treasure Hunter.
- Deeper bard crowd-control encounters.
- Housing workshop specialization and placed-station upgrades.
- Mastery point experiments only if earned from profession achievements and used for clarity, recipes, utility, alternate interactions, or active techniques.

## Data Model

`src/data/professions.ts` owns the graph data:

- `ProfessionCluster` describes a profession, its skills, graph nodes, edges, color, and suggested goal.
- `ProfessionNode` stores graph position and type.
- `ProfessionEdge` stores relationship semantics.
- `MasteryMilestone` stores requirements, visibility requirements, reward type, reward, and unlock message.
- Helper functions compute profession activity, milestone progress, requirement text, and requirement completion.

UI state in `GameState` stores the selected skill view, selected profession, atlas zoom, and pinned profession goal. These fields are persisted through save/load migration defaults.

## Non-Goals

This system must not implement:

- A giant passive tree.
- Generic `+5%` stat nodes.
- Level-point spending as the main progression path.
- Class lock-in.
- Power growth disconnected from practiced actions.
- Hidden optimal routing that invalidates sandbox freedom.

The player should be able to choose a direction without being forced into a class. The Atlas explains possible identities; the Ledger remains the truth.
