# Motion Notes

## Pipeline

- Simulation runs at a fixed `30hz` by default (`fixedDelta = 1 / tickRate`).
- Rendering runs from `requestAnimationFrame`; `state.realtime.lastFrameDelta` stores the render-frame delta.
- `Simulation.update()` accumulates frame time, advances zero or more fixed steps, then writes `state.realtime.renderAlpha = accumulator / fixedDelta` for render interpolation.
- Gameplay positions remain authoritative in `state.player.position` and `entity.position`.

## Previous Jitter Sources

- The renderer placed actors directly at raw fixed-tick positions, so a 60hz display could show two identical frames followed by a larger fixed-step jump.
- Camera follow accepted a constant lerp alpha, not frame time, and the first frame lerped from origin instead of snapping to the current area/player.
- Movement lead stayed enabled under reduced motion.
- Click-to-move pathfinding still targets tile centers, but movement integration itself is continuous; the visible snap was mostly render sampling and camera response.

## Current Contract

- `RenderMotionTracker` stores previous/current render transforms per visible actor and samples with `renderAlpha`.
- Large jumps and area-key changes snap instead of interpolating, so doors and portals do not show a long pan from the previous area.
- Camera follow uses frame-rate-aware damping, a tiny dead zone, first-frame/area-transition snap, movement lead when reduced motion is off, and combat target bias.
- Projectiles render with a small fixed-step lead from `renderAlpha` so their visual position advances between simulation ticks.
- Help settings expose camera smoothing: Low, Medium, High. Reduced motion dampens character bob and disables movement lead.
