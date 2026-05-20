# ADR: React UI Overlay Migration

## Status

Accepted for staged implementation.

## Context

Briarbrook is a browser-only Vite, TypeScript, and Three.js game. The world renderer owns one WebGL canvas (`#game-canvas`), while the UI is mounted into a separate DOM root (`#ui-root`). Gameplay state remains owned by `Simulation` and the existing action dispatch path.

The current UI is frameworkless TypeScript and CSS rendered through `UIManager` plus specialized panels. That approach was workable for small HUD surfaces, but the current panel set now includes inventory, bank, hotbar, spellbook, crafting, market, journal, build mode, chat, help/settings, Profession Atlas, Adventure Map, tooltips, and movable windows. Those surfaces need repeatable layout primitives, a reliable overlay stack, scroll contracts, and predictable component boundaries.

The visible failure mode is player-facing UI instability: overlapping text, inconsistent window bodies, crowded tabs, clipped tooltips, and complex planning panels that compete with ordinary inventory windows.

## Options Considered

### Option A: Continue Frameworkless UI

Pros:
- No new runtime dependencies.
- Smallest bundle impact.
- Least tooling change.

Cons:
- Current overlap and layout failures are likely to continue.
- Panel structure is hard to enforce across many bespoke render functions.
- Complex Atlas, Map, Spellbook, Crafting, and Build Mode surfaces need stronger composition contracts.
- More hand-rolled state and lifecycle bugs around windows, tooltips, and scroll containers.

### Option B: React UI Overlay, Keep Three.js Renderer

Pros:
- Component composition matches the complexity of the UI layer.
- Shared layout primitives can become enforceable contracts.
- The UI can still mount entirely under `#ui-root`.
- Three.js, `VoxelRenderer`, `Simulation`, and gameplay systems stay intact.
- Testing and visual regression gates are easier to add around React components and rendered flows.
- Future specialized UI libraries can be evaluated only where justified.

Cons:
- Adds React dependencies and bundle size.
- Requires a deliberate bridge so React components never mutate `GameState` directly.
- Migration cost is real, and duplicate legacy/React panels must be avoided.

### Option C: Preact UI Overlay

Pros:
- Smaller bundle than React.
- Similar component model.

Cons:
- Compatibility tradeoffs for ecosystem packages.
- May still need a React compatibility layer for richer workspace tooling.

### Option D: Lit Or Web Components

Pros:
- Standards-based model.
- Lower dependency footprint than React in some cases.

Cons:
- Less direct ecosystem support for complex game workspaces.
- Still requires the same layout and state architecture discipline.

### Option E: React Three Fiber Rewrite

Rejected for now.

The problem is the DOM UI layer, not world rendering. Rewriting the renderer would be a high-risk migration that does not directly solve unreadable panels, tooltips, tabs, scroll bodies, or window workspaces.

## Decision

Use Option B: migrate the UI layer to a React overlay mounted under `#ui-root`, while keeping the Three.js renderer and gameplay simulation architecture intact.

This migration is explicitly not a React Three Fiber migration. It is not a gameplay expansion. It is a UI architecture rescue pass focused on making the interface readable, testable, and structurally hard to break.

## Dependency Policy

Allowed during this migration:
- `react`
- `react-dom`
- `@vitejs/plugin-react` if needed by the Vite setup
- `@xyflow/react` later only if Profession Atlas graph readability justifies it
- `@playwright/test` later only if accepted for screenshot or visual regression gates

Avoid during this migration:
- Redux unless local state boundaries prove insufficient
- Tailwind
- Large component libraries
- React Three Fiber
- Full CSS-in-JS runtimes

## Architecture Constraints

- `Simulation` remains the authoritative gameplay mutation path.
- React components may read selected UI state and dispatch commands, but must not directly mutate `GameState`.
- The Three.js renderer, `VoxelRenderer`, world props, characters, VFX, and camera remain outside React.
- Migrated panels must not be rendered by both React and legacy `UIManager` at the same time.
- Complex panel bodies must use shared layout primitives and scroll containers instead of ad hoc absolute-positioned text.
- Tooltips, popovers, modals, toasts, and workspace overlays must render through global overlay/portal layers.

## Migration Plan

1. Add the React overlay shell and keep the legacy UI as the initial compatibility fallback.
2. Add a game-state bridge with selectors and command dispatch helpers that preserve Simulation authority.
3. Introduce design tokens and layout primitives: `GameWindow`, `PanelHeader`, `PanelTabs`, `PanelToolbar`, `SplitPane`, `ScrollArea`, `SlotGrid`, `DataList`, `DetailPane`, `ActionFooter`, `InspectorDrawer`, `StatusRow`, `Badge`, `IconButton`, `Text`, `EmptyState`, `ModalWorkspace`, `OverlayLayer`, `TooltipPortal`, and `ToastLayer`.
4. Migrate the window manager and workspace model before moving complex panels.
5. Migrate core gameplay UI surfaces in ordered slices: inventory, bank, hotbar, spellbook, crafting, market, journal, Profession Atlas, Adventure Map, build mode, chat, help, and settings.
6. Retire legacy rendering for each migrated panel immediately after its React version is accepted.
7. Add screenshot and layout regression gates for the accepted viewport targets.
8. Measure and document bundle and runtime impact before the alpha acceptance decision.

## Rollback And Containment Plan

- Keep the renderer and simulation APIs stable so React UI work can be reverted without world-renderer rewrites.
- Gate panel migration one surface at a time; do not partially render the same panel in two systems.
- Preserve focused tests around selectors, command dispatch, window state, hotbar usability, tooltip behavior, and layout budgets.
- If a React migration slice fails acceptance, pause that panel and leave the last stable legacy panel active until a readable React replacement exists.
- If React bundle or runtime cost exceeds the documented budget, stop adding optional React ecosystem dependencies and revisit the component split before continuing.

## Consequences

The UI layer now has an explicit architectural direction: React for DOM overlay UI, Three.js for the world, and Simulation for gameplay authority. Gameplay feature work remains frozen for this migration pack except where a minimal adapter is needed to preserve existing UI behavior.
