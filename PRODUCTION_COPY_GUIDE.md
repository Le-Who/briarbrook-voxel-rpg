# Production Copy Guide

This guide keeps normal-mode UI copy aligned with the reference-locked production tone from prompt 137.

## Terminology

Use player-facing terms:

- Available, Known, Trained, Unlocked
- Locked, Unlearned, Unavailable
- Practice in the world
- Goal accepted
- Route, path, contract, order, station, supply
- Local Map, current area, waypoint, route

Keep technical state inside the dev overlay only. Normal gameplay can expose useful status, but it must describe the player's situation rather than the implementation state.

## Banned In Normal Mode

Do not show these words or patterns in regular HUD, panels, menus, tooltips, toasts, or service windows:

- dev, debug, todo, placeholder
- implemented, not implemented, not yet implemented
- future as a status label
- raw object ids, internal ids, or raw coordinate pairs
- migration notes, build-scope notes, screenshot parity notes, QA notes
- repeated technical warnings or diagnostics

Exceptions are allowed only inside the dev overlay or source/tests/docs.

## Tone Examples

Use short, concrete copy:

- Good: `Goal accepted.`
- Good: `Practice in the world.`
- Good: `Locked path.`
- Good: `Local Map.`
- Good: `Available now.`

Avoid explaining production status to the player:

- Bad: `Profession contract accepted. Skills remain classless.`
- Bad: `Implemented / trainable where applicable.`
- Bad: `Future / not yet trainable.`
- Bad: `Map 144:-211.`
- Bad: `Use this workspace while the migration remains scoped.`

## Before And After

| Before | After |
| --- | --- |
| Future | Locked |
| Implemented | Available |
| World practice | Practice in the world |
| Future loop | Locked path |
| Future hidden | Locked paths hidden |
| Future tool | Locked tool |
| Available in this build | Available now |
| Profession contract accepted. Skills remain classless. | Profession goal accepted. |
| Map 144:-211 | Local Map |

## Dev Overlay Rule

Diagnostics, raw ids, raw coordinates, screenshot parity state, perf counters, and internal status can remain in the dev overlay. If a player needs the information, rewrite it as gameplay copy before showing it in normal mode.
