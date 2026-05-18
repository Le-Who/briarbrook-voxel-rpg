# Player Experience Cut And Polish Pass

## Fresh Save Audit

- First screen should teach one route: talk to Mira, gather a first resource, check kit, then branch into skills, magic, banking, road danger, and housing.
- The first HUD now keeps status, hotbar, inventory, journal, known spellbook access, chat, minimap, and a single guide path visible without also opening the quest tracker.
- Market and Build are no longer default quick-button noise on a fresh town start. They appear after matching progress, context, or use.
- The Guide panel shows the current step and one adjacent step instead of a long task list. Quest detail remains available through Journal.
- NPC labels are more selective on the first screen: important nearby quest, merchant, guard, and immediate social targets remain readable; distant social labels stay quiet.

## First-Hour Priorities

- Keep HP, mana, stamina, hotbar, inventory, and the next objective readable at all times.
- Make the spellbook explain known and usable spells first; unknown spells stay discoverable without dominating the default view.
- Let interaction prompts answer "what can I do now" in one short sentence.
- Keep auto-approach explicit through the combat setting and visible intent feedback.
- Keep windows resizable and focusable, but avoid launching competing panels on load.

## Cut Or Deferred Noise

- Hidden on fresh start: Market quick action, Build quick action, Quest Focus panel.
- Deferred to context: full economy loop, housing placement, broad skill browsing, and unknown spell study.
- Kept but compressed: Guide, chat, NPC labels, and first-step prompt.

## Regression Checks

- Fresh load should show Guide but not Quest Focus.
- Guide should stay above the hotbar at 720p and scroll rather than push into the bottom UI.
- Quick buttons on a fresh save should be `C`, `K`, `I`, `M`, `A`, `J`, and `?`.
- Opening Skills, Inventory, Journal, Help, Spellbook, or Market after unlock should still use managed-window focus order and avoid hotbar overlap.
