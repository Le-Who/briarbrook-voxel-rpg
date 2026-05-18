# Terminology

This project keeps player-facing language short, actionable, and rooted in the world.

## Core Verbs

- Equip: put gear, weapons, tools, or clothing into an equipment slot.
- Use: activate an item that does not need a more specific verb.
- Cast: begin a spell or magical ability.
- Inspect: examine a container, object, clue, or hazard before acting.
- Gather: collect a natural resource.
- Mine: gather ore or stone from rock, cave walls, or ore tiles.
- Chop: gather wood from a tree.
- Pick Lock: open a locked chest or door with lockpicking.
- Disarm: make a trap safe before opening or using an object.

## Writing Rules

- Say what failed, why it failed, and what the player can do next.
- Use world terms instead of implementation terms. Write "spellbook", "reagent", "chest", and "map marker"; do not write "entityId", "node", "action state", or debug-only names.
- Prefer one clear action per sentence.
- Keep button labels and commands compact.
- Keep status text gender-neutral and avoid text baked into icons or art.
- Use string keys with interpolation for variable text, counts, item names, spell names, rewards, and requirements.
- Allow longer localized strings by avoiding fixed-width text assumptions in UI controls.
