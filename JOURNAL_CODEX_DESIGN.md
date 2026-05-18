# Journal Codex Design

Prompt 72 turns the Journal into the player's knowledge layer. It is state-derived and progressive: entries appear from quests, actions, inventory, spells, locations, rumors, treasure state, and housing state.

## Sections

- Current Objective: first-hour next step plus pinned profession goal or pinned rumor.
- Active Quests: active quest names and the next incomplete objective.
- Discovered Mechanics: concise learned systems such as gathering, banking, bandages, magery, road risk, dungeon secrets, housing, and treasure hunting.
- Rumors: active discovered world events with area, map hint when available, and pin/unpin controls.
- Known Locations: discovered areas only.
- Profession Goals: long-term planning prompts with related skills hidden behind details.
- Recipes Learned: appears after crafting access or relevant progress.
- Spells Learned: known spellbook entries only.
- Treasure Clues: map fragments, deciphered clues, pinned maps, and found caches.
- Housing Plans: plot state, starter build resources, placed pieces, and storage.
- Completed Events: completed tutorial quests and resolved event summaries when available.

## Unlock Rules

The Journal does not start as a full manual. Entries unlock from:

- first action or quest objective progress;
- opening/using a related panel;
- discovered area or active rumor;
- relevant items in inventory;
- known spells;
- recipe/crafting progress;
- treasure map runtime state;
- housing ownership, resources, or placed pieces.

## Tone And Interaction

Entries use concise in-world phrasing and avoid internal system wording. Advanced details live behind disclosure controls. Rumors are real `WorldEventState` entries, and `PIN_RUMOR` lets the player keep one active rumor visible in the Current Objective block.
