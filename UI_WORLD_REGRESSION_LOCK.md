# UI And World Regression Lock

This lock applies to future changes touching UI windows, world composition, build mode, traversal, service interiors, dense menus, or reference screenshots.

## Banned Patterns

- Normal-mode debug or implementation copy visible to players.
- Overlapping window text, clipped action buttons, hidden footers, or page-level scroll leaks from window contents.
- Duplicate legacy and React panels for the same gameplay surface.
- Context menus or hotbar assignment menus appearing underneath inventory, bank, market, crafting, or other React windows.
- Build Mode as an abstract center table detached from the world.
- Profession Atlas as a dev wiki, raw implementation board, or overlapping node/detail stack.
- Invisible blockers without a visible wall, fence, riverbank, prop, water edge, or other readable cause.
- Service interiors as sparse rooms with only a counter and no readable work/storage context.

## Required Window Contracts

- Floating React windows must expose a title-bar drag handle and remain within viewport/hotbar safe areas.
- Scrollable windows must keep header/toolbars/actions fixed and scroll only the content region.
- Context menus must render above React windows and remain keyboard/click reachable.
- Market rows, tabs, and detail actions must respond to clicks.
- Inventory, bank, crafting, spellbook, market, journal, map, Atlas, and chat must preserve player-facing copy and avoid dev labels.
- UI reset must restore usable default positions without overlapping core service windows.

## Required Build Mode Spatial Behavior

- Build Mode must show the real plot/world context, a world ghost/footprint, left palette, right inspector, and bottom action bar.
- Placement feedback must use player-facing readiness/blocker/shortage messages.
- Build mode must preserve housing placement rules, material costs, collision checks, and path constraints.
- The status/inventory stack must not cover the spatial build workspace; required inventory/material info belongs in the palette/inspector/action flow.

## Reference Parity Process

- Treat `REF_*` images as target layouts/compositions/UX states, not moodboards.
- Treat `CURRENT_*` images as negative references only.
- For each future reference-affecting change, capture screenshot proof before acceptance.
- Record remaining gaps in a deviation note when exact parity is impossible inside the current renderer or asset pipeline.
- Do not accept a reference state below 4/5 for readability, no-overlap/clipping, interaction clarity, or absence of debug clutter.

## Traversal And Collision

- Every obvious road, bridge, room entrance, service approach, resource approach, and plot route must be reachable.
- Collision must match visible geometry.
- If a blocker exists, `AreaManager.getBlockerExplanation` should describe a visible cause.
- Portal destinations must land on walkable tiles and must not chain immediately into another portal.
