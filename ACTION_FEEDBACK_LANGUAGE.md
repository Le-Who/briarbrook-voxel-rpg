# Action Feedback Language

Prompt 69 establishes a shared readability contract for combat, magic, gathering, equipment, and world interactions. The goal is that a player can understand what happened from the world, HUD prompt, and short floating feedback without needing to read chat.

## Taxonomy

| Feedback type | Meaning | Primary channels | Chat or log |
| --- | --- | --- | --- |
| Input acknowledgement | The input was accepted. | Animation, UI badge | No |
| Valid target | The hovered/selected target can receive the action. | Cursor, outline, UI badge | No |
| Invalid target | The action cannot apply to that target. | Invalid cursor, short prompt, floating mark | No |
| Action start | A timed action has begun. | Character animation, progress ring/bar, prompt, sound | No |
| Action progress | A cast, harvest, bandage, or craft is ongoing. | Progress ring/bar, action badge | No |
| Action success | The action completed. | Animation, VFX, floating text, prompt, sound | No by default |
| Action failure | A transient failure occurred. | Failure animation/VFX, floating text, prompt, sound | No by default |
| Resource consumed | Mana, reagent, stamina, durability, or charges were spent. | HUD badge, inventory state, journal if meaningful | No |
| Resource gained | Loot, logs, ore, fish, mana, health, or gold was gained. | Floating text, prompt, inventory/HUD badge | No by default |
| Skill gain | A skill changed enough to matter. | Toast, skill panel badge, journal | System log allowed |
| Status effect | Buff, poison, shield, hidden, revealed, cooldown. | Status badge, VFX, prompt | No by default |
| Cooldown or lockout | The action is temporarily unavailable. | Disabled control, cooldown badge, prompt | No |
| Interrupted or cancelled | The action was stopped by movement, damage, range, or Escape. | Animation cancel, floating text, prompt | No by default |
| Persistent world change | A field, wall, trap, marker, quest state, or route changed. | World VFX, journal, prompt | System log allowed |

`src/systems/ActionFeedbackSystem.ts` is the runtime source of truth for this matrix through `ACTION_FEEDBACK_CHANNELS`.

## Style Rules

- Use a short result first: `+4 Logs`, `Fireball fizzles.`, `You are too far away for that spell.`
- Add one corrective hint when the player can fix the problem: `Move closer or choose a nearer target.`
- Avoid turning every click into chat. Chat is for persistent history, system state, quest/world changes, party/social text, and explicit logs.
- Prefer floating text for local results and prompt text for reasons.
- Merge or suppress repeated transient messages. Identical invalid actions use a short anti-spam window.
- Combat-critical feedback wins over routine gains. Do not obscure damage, poison, death, or interruptions with low-value chatter.

## Action Examples

| Action | Start | Success | Invalid or failure |
| --- | --- | --- | --- |
| Harvest tree | Face target, short gathering state | `+6 Logs` floating over tree, prompt mirrors gain | `You need a tree to chop this. Select a tree.` |
| Cast spell | Words of power prompt, cast state, cast sound | VFX/projectile, result prompt, damage/heal floating text | `Fireball fizzles. Try again with higher Magery or better focus.` |
| Melee/ranged combat | Facing, swing or shot animation | Damage floating text, hit flash, health bar movement | Cooldown/blocked/range prompt with no chat spam |
| Equip item | Equipment slot changes, paperdoll attachment | Prompt names equipped item, slot visual updates | Slot/type reason plus corrective hint |
| World utility spell | Cast state and target cue | Field/wall/trap/mark visible in world | Target-type reason plus corrective hint |

## Release Acceptance

- A successful action can be understood from prompt, floating text, animation/VFX, or HUD state without opening chat.
- An invalid action states what is wrong and, when possible, the next correction.
- Repeated invalid clicks do not flood floating text or chat.
- Chat remains a historical/system channel, not the primary action feedback channel.
