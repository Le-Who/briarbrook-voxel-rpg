# UI Stability Notes

## Tooltip And Hover System

- Previous item, spell, and skill tooltips were CSS pseudo-elements driven by `data-tooltip`; several controls also used native `title` attributes. Those two systems could overlap and display different content for the same hover.
- HUD HTML is periodically replaced as game state changes. A tooltip created as part of the hovered element is therefore destroyed and recreated with the panel, which can look like frame-by-frame flicker during clock, cooldown, or stat updates.
- Native browser `title` bubbles were unmanaged, delayed independently, and could compete with custom tooltip rendering.
- Tooltip content lived in each panel, so there was no single owner for show delay, hide grace, pointer-event policy, viewport clamping, or debug visibility.

## Current Contract

- `TooltipManager` is the only hover tooltip renderer. Panels provide stable `data-tooltip-id`, `data-tooltip-source`, and concise `data-tooltip` content.
- The tooltip layer is outside the HUD layer, so HUD replacement does not remount a visible tooltip.
- Tooltip DOM uses `pointer-events: none` and is positioned near the hovered element rather than under the cursor.
- The manager uses a normal hover delay, a short hide grace period, stable anchor identity, and viewport clamping.
- The dev overlay enables a tooltip debug readout with current hover ID, source, last reason, remount count, and last update timestamp.
