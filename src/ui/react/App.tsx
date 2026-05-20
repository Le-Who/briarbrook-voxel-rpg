import { lazy, Suspense, useEffect, type ReactElement } from 'react';
import type { GameAction } from '../../game/Actions';
import { uiPanelIds, uiPanelRegistry } from './bridge/uiPanelRegistry';
import { useGameUIBridge } from './bridge/GameUIBridgeContext';
import type { GameUISnapshot } from './bridge/selectors';
import { InventoryBankHotbar } from './windows/InventoryBankHotbarSurfaces';
import { CommonSurfaceLayer } from './windows/CommonSurfaces';
import { useGameSnapshot } from './hooks/useGameSnapshot';
import { useReactPanelRender } from './components/renderMetrics';

const LazyKnowledgePanels = lazy(() =>
  import('./windows/KnowledgePanelsSurfaces').then((module) => ({ default: module.KnowledgePanels }))
);
const LazyPlanningWorkspaces = lazy(() =>
  import('./windows/PlanningWorkspaces').then((module) => ({ default: module.PlanningWorkspaces }))
);
const reactPanelCount = uiPanelIds.filter((panelId) => uiPanelRegistry[panelId] === 'react').length;

export function App(): ReactElement {
  const bridge = useGameUIBridge();
  useReactPanelRender('shell');
  const planningWorkspaceOpen = useGameSnapshot((snapshot) => Boolean(snapshot.windows.panels.skills || snapshot.windows.panels.map || snapshot.map.mode === 'expanded'));
  const buildLayoutRequested = useGameSnapshot((snapshot) => Boolean(snapshot.buildMode.active || snapshot.windows.panels.build));
  const knowledgeOpen = useGameSnapshot((snapshot) => Boolean(snapshot.windows.panels.spellbook || snapshot.crafting.open || snapshot.market.open || snapshot.windows.panels.journal));
  const buildLayoutOpen = !planningWorkspaceOpen && buildLayoutRequested;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (isEditingElement(event.target) || isEditingElement(document.activeElement)) {
        (document.activeElement as HTMLElement | null)?.blur();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      const action = reactEscapeAction(bridge.getSnapshot());
      if (!action) return;
      event.preventDefault();
      event.stopPropagation();
      bridge.dispatchAction(action);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [bridge]);

  return (
    <div
      className="react-ui-app"
      data-react-ui-status="coexistence"
      data-react-ui-panel-count={reactPanelCount}
      aria-hidden={reactPanelCount === 0 ? 'true' : undefined}
    >
      <InventoryBankHotbar hideContainers={planningWorkspaceOpen || buildLayoutOpen} />
      {!planningWorkspaceOpen && !buildLayoutOpen && knowledgeOpen ? (
        <Suspense fallback={null}>
          <LazyKnowledgePanels />
        </Suspense>
      ) : null}
      {planningWorkspaceOpen ? (
        <Suspense fallback={null}>
          <LazyPlanningWorkspaces />
        </Suspense>
      ) : null}
      <CommonSurfaceLayer planningWorkspaceOpen={planningWorkspaceOpen} />
    </div>
  );
}

function reactEscapeAction(snapshot: GameUISnapshot): GameAction | null {
  if (snapshot.buildMode.active || snapshot.windows.panels.build) return { type: 'TOGGLE_BUILD_MODE', active: false };
  if (snapshot.windows.panels.help || snapshot.windows.panels.settings) return { type: 'TOGGLE_PANEL', panel: 'help', open: false };
  if (snapshot.map.mode === 'expanded') return { type: 'SET_MINIMAP_MODE', mode: 'standard' };
  if (snapshot.windows.panels.map) return { type: 'TOGGLE_PANEL', panel: 'map', open: false };
  if (snapshot.windows.panels.skills) return { type: 'TOGGLE_PANEL', panel: 'skills', open: false };
  if (snapshot.windows.panels.journal) return { type: 'TOGGLE_PANEL', panel: 'journal', open: false };
  if (snapshot.windows.panels.market) return { type: 'TOGGLE_PANEL', panel: 'market', open: false };
  if (snapshot.windows.panels.crafting) return { type: 'TOGGLE_PANEL', panel: 'crafting', open: false };
  if (snapshot.windows.panels.spellbook) return { type: 'TOGGLE_PANEL', panel: 'spellbook', open: false };
  if (snapshot.bank.open) return { type: 'TOGGLE_PANEL', panel: 'bank', open: false };
  if (snapshot.windows.panels.inventory) return { type: 'TOGGLE_PANEL', panel: 'inventory', open: false };
  if (snapshot.chat.mode !== 'collapsed') return { type: 'SET_CHAT_MODE', mode: 'collapsed' };
  return null;
}

function isEditingElement(target: EventTarget | Element | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}
