# Window Scroll Matrix

Prompt: 134 - Reference-Locked Scroll, Overflow, Window Behavior Rescue

References:

- `REF_134_SCROLLABLE_SPELLBOOK.png`
- `REF_139_SPELLBOOK_READABILITY.png`
- Negative reference: `CURRENT_ATLAS_BAD.png`

Proof:

- Browser runner: `artifacts/playwright-runner/134-window-scroll-proof.mjs`
- Browser proof screenshots:
  - `artifacts/playwright/134-spellbook-scroll-contract.png`
  - `artifacts/playwright/134-profession-atlas-contract.png`
  - `artifacts/playwright/134-chat-scroll-contract.png`
  - `artifacts/playwright/134-reference-proof-sheet.png`

## Shared Contract

- Fixed areas: `PanelHeader` marks `data-bb-fixed="header"`, `PanelTabs` and `PanelToolbar` mark `data-bb-fixed="toolbar"`, `ActionFooter` marks `data-bb-fixed="footer"`.
- Scroll areas: `ScrollArea` marks `data-bb-scroll="true"` and `data-ui-scroll="true"`.
- Body regions: `GameWindow` marks a bounded `data-bb-window-body="true"`.
- Layout regions: `SplitPane`, `DetailPane`, `SlotGrid`, and `InspectorPanel` expose explicit `data-bb-layout` markers.
- Browser acceptance: 1366x768 proof requires the active window to stay inside viewport, avoid panel-level overflow without a scroll area, and expose scrollable bodies where content exceeds the visible region.

## Matrix

| Window | Scroll areas | Fixed areas | Min size | Compact behavior | 1366x768 |
| --- | --- | --- | --- | --- | --- |
| Chat | Chat log (`bb-react-chat-log`) | Header, tabs/toolbar, input footer | 280x150 | Collapsed button, compact mode, combat-hidden mode | Pass |
| Inventory | Slot grid scroll (`bb-react-slot-scroll`) | Header, search toolbar, action footer | 232x280 | Right-side floating window; slot grid shrinks by CSS slot size | Pass |
| Equipment | Equipment state is surfaced through inventory item badges, hotbar state, and status/equipment selectors; no separate duplicated equipment window is accepted in normal UI | Inventory/status fixed areas | Inherits inventory/status constraints | Equipment details remain compact badges instead of a second dense panel | Pass |
| Bank | Bank slot grid scroll (`bb-react-slot-scroll`) | Header, action/search toolbar, action footer | 250x260 | Service stack/pairing uses window manager; bank and inventory remain separate operable windows | Pass |
| Spellbook | Spell list scroll and detail-pane body scroll | Header, toolbar/filter row, action footer | 520x360 | Two-column split at 1366; bounded list and stable detail pane | Pass |
| Crafting/smithy | Recipe list scroll and detail-pane body scroll | Header, station toolbar, crafting action footer | 520x420 | Two-column split; selected recipe details stay stable while list scrolls | Pass |
| Market/work orders | Market/order list scroll and detail-pane body scroll | Header and toolbar; no fixed footer required for current order actions | 560x360 | Two-column split; detail pane owns order actions | Pass |
| Journal | Entry list scroll and detail-pane body scroll | Header; section rail remains in split pane | 520x360 | Three-pane journal split at 1366; details scroll inside pane | Pass |
| Build mode | Build-piece catalog scroll and material/detail scroll | Header, placement toolbar, action footer | 340x380 | Dedicated spatial workspace; catalog/materials bounded inside plot UI | Pass |
| Profession Atlas | Lens sidebar scroll and pathway card scroll | Header, tabs/toolbar, action footer | 720x460 | Full planning workspace; details live in a bounded detail pane, not a dev-wiki sprawl | Pass |
| Adventure Map | No body overflow after containment fix; detail pane remains bounded | Header and layer toolbar | 700x440 | Clustered map labels avoid duplicated service markers | Pass |
| Help/settings | Help and settings columns scroll independently | Header and action footer | 360x320 | Modal keeps two internal scroll columns inside viewport | Pass |

## Deviation Note

The current spellbook now follows the REF_134/REF_139 structure: fixed header, fixed filters, scrollable list, stable detail pane, and fixed actions. It is not a pixel-perfect visual match to the reference art yet: icon art, spell count/density, backdrop, and typography polish remain lower fidelity. Prompt 134 accepts the layout/overflow contract only; later visual prompts must not reinterpret this as permission to return to `CURRENT_ATLAS_BAD.png`-style layout chaos.
