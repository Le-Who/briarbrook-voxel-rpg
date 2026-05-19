# Inventory Layout Notes

## Audit Findings

- The extra right strip came from a fixed four-column grid: `.slot-grid` used `repeat(4, 48px)` with `8px` padding, while the managed inventory window can be wider than the old 222px panel. The unused window width looked like an accidental side rail, and `scrollbar-gutter: stable` made the mismatch more visible.
- Inventory resizing disappeared because the active `windowRegistry` entry for `inventory` did not set `canResize: true`. The older exported `windowDefinitions.inventory` still claimed vertical resizing, but the runtime decorator only reads the registry when it adds `window-resizable` and observes size changes.
- Tooltip clipping came from the legacy `.slot::after` CSS tooltip. It rendered inside the slot/grid/window stacking and overflow rules, so it could be clipped by the scroll body or appear behind panel edges. Item slots already provide `data-tooltip` for the global tooltip layer, so the pseudo-tooltip was a conflicting second renderer.
- The grid width was hardcoded rather than derived from available panel width. Item cells also used fixed `width` and `height`, so changing the managed window size did not produce a clean responsive inventory layout.

## Layout Contract

- Inventory is now a managed, resizable window with fixed header, scrollable grid body, selected-item inspector/action area, and fixed gold/weight footer.
- Inventory grid columns derive from available width using the slot-size token instead of a fixed four-column calculation.
- Empty slots remain lightweight drop targets without tooltip payloads.
- Item details live in the global tooltip layer and in the selected-item inspector, not inside grid cells.
