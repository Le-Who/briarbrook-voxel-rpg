# Legacy UI Retirement

This document tracks player-facing frameworkless UI paths during the React UI migration. Direct legacy unit tests may remain temporarily, but migrated panels must not be rendered by `UIManager.renderHud()`.

| Surface | React replacement status | Legacy path | Disable/remove path | Risks | Tests |
| --- | --- | --- | --- | --- | --- |
| Inventory | React-owned | `src/ui/InventoryPanel.ts` | `UIManager.renderHud()` returns empty when `isReactPanel('inventory')` | Legacy direct tests still import old markup | `inventory-bank-hotbar.test.tsx`, `test:ui-smoke` |
| Bank | React-owned | `src/ui/BankPanel.ts` | `UIManager.renderHud()` returns empty when `isReactPanel('bank')` | Service opening still depends on Simulation `OPEN_BANK` | `inventory-bank-hotbar.test.tsx`, `test:ui-smoke` |
| Hotbar | React-owned | `src/ui/Hotbar.ts` | `UIManager.renderHud()` returns empty when `isReactPanel('hotbar')` | Drag/drop still uses shared DOM payload handlers until a React drag controller replaces them | `inventory-bank-hotbar.test.tsx`, `drag-payload.test.ts`, `test:ui-smoke` |
| Spellbook | React-owned | `src/ui/SpellbookPanel.ts` | `UIManager.renderHud()` returns empty when `isReactPanel('spellbook')` | Legacy direct tests remain for old spell filtering contracts | `knowledge-panels.test.tsx`, `SpellbookPanel.test.ts`, `test:ui-smoke` |
| Skills / Atlas / Mastery | React-owned | `src/ui/SkillsPanel.ts` | `UIManager.renderHud()` returns empty when `isReactPanel('skills')` | Legacy graph tests remain until data contracts move to React tests | `planning-workspaces.test.tsx`, `profession-ui.test.ts`, `test:ui-smoke` |
| Journal | React-owned | `src/ui/JournalPanel.ts` | `UIManager.renderHud()` returns empty when `isReactPanel('journal')` | Legacy direct codex tests remain | `knowledge-panels.test.tsx`, `journal-codex.test.ts`, `test:ui-smoke` |
| Market | React-owned | `src/ui/MarketBoardPanel.ts` | `UIManager.renderHud()` returns empty when `isReactPanel('market')` | Legacy direct market tests remain | `knowledge-panels.test.tsx`, `profession-ui.test.ts`, `test:ui-smoke` |
| Adventure Map | React-owned | `src/ui/MapPanel.ts` | `UIManager.renderHud()` returns empty when `isReactPanel('map')` | Minimap remains legacy HUD, expanded map is React-owned | `planning-workspaces.test.tsx`, `map-navigation.test.ts`, `test:ui-smoke` |
| Build Mode | React-owned | `src/ui/BuildPanel.ts` | `UIManager.renderHud()` returns empty when `isReactPanel('build')` | Housing storage tools are compacted; deeper storage UI can move later | `common-surfaces.test.tsx`, `test:ui-smoke` |
| Chat | React-owned | `src/ui/ChatPanel.ts` | `UIManager.renderHud()` returns empty when `isReactPanel('chat')`; root click handler ignores React panel clicks | Legacy direct chat tests remain | `common-surfaces.test.tsx`, `chat-panel.test.ts`, `test:ui-smoke` |
| Tooltip | Transitional | `src/ui/TooltipManager.ts`, React `OverlayLayer` / `TooltipPortal` | Keep a single active hover tooltip dispatcher; do not render tooltips inside panel scroll containers | Full React tooltip dispatcher is not yet wired, so prompt 130/131 must account for the transition | `overlay-layer.test.tsx`, `TooltipManager.test.ts`, `layout-guard.test.ts` |
| Help / Settings | React-owned | `src/ui/HelpPanel.ts` | `UIManager.renderHud()` returns empty when `isReactPanel('help')`; Settings renders inside the React Help/Settings window | Separate settings route does not exist yet | `common-surfaces.test.tsx`, `ui-customization.test.ts`, `test:ui-smoke` |

Current retirement rule:
- Player-facing rendering follows `uiPanelRegistry`.
- Legacy panel files may remain only for direct regression tests, rollback reference, and non-player-facing contracts during this migration pack.
- React panel clicks are ignored by the legacy root click dispatcher to avoid duplicate Simulation actions.
- Prompt 130 added screenshot/collision evidence, and prompt 132 added the `test:ui-alpha` duplicate-panel gate.
- Physical removal of old panel modules should wait until direct legacy tests are replaced by React/data-contract tests.
