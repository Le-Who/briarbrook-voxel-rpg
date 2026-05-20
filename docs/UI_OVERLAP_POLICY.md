# UI Overlap Policy

This policy protects Briarbrook's React UI from returning to unreadable overlapping text and competing windows.

## Layout Rules

- Complex panels use React layout primitives: `GameWindow`, `PanelHeader`, `PanelTabs`, `PanelToolbar`, `SplitPane`, `ScrollArea`, `DataList`, `DetailPane`, `ActionFooter`, `InspectorDrawer`, `StatusRow`, `Badge`, `IconButton`, `Text`, and `EmptyState`.
- Long player-facing text must not be placed with raw absolute positioning inside windows.
- Every body that can overflow must include `ScrollArea` or an equivalent element with `data-bb-scroll="true"`.
- Dense detail text belongs in `DetailPane`; list cards stay compact and scannable.
- Planning workspaces hide or collapse unrelated panels while keeping the hotbar usable.
- Build Mode uses the dedicated Build Layout and does not stack a floating build panel over inventory.
- Tooltips render through a global overlay root or the single transitional tooltip layer, never inside inventory, spellbook, map, chat, or build scroll containers.
- Normal mode must not show debug-like labels or raw duplicated strings such as repeated wind-up labels.

## Development Guard

React UI mounts `ReactLayoutGuard` in dev runtime. It warns with `[react-ui-layout-guard]` when it detects:

- a React panel that overflows without a `ScrollArea`;
- clipped visible text where clipping can be detected;
- tooltip markup outside the tooltip overlay root or transitional tooltip layer;
- a React panel outside the viewport;
- a floating React panel overlapping the hotbar safe area.

Legacy managed windows keep their existing `[ui-window-qa]` guard. Both guards are warnings, not automatic layout mutation.

## Acceptance Use

- New React panels must include SSR/unit coverage for ownership and layout markers.
- Browser smoke must cover 1366x768 and 1600x900 for player-facing migrated surfaces.
- If a graph, map, or dense list cannot be made readable quickly, prefer a readable cards/list fallback over a broken graph.
- `npm run test:ui-visual` owns screenshot/collision gates; this policy defines what those gates enforce.
- `npm run test:ui-alpha` is the final acceptance route for prompt 132 and must keep the same no-overlap/no-duplicate guarantees.
