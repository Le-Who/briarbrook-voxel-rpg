import { useSyncExternalStore } from 'react';
import type { GameAction } from '../../../game/Actions';
import type { ManagedWindowId } from '../../../game/types';
import { useGameUIBridge } from '../bridge/GameUIBridgeContext';
import { selectWindowLayout, type GameUISnapshot } from '../bridge/selectors';
import type { GameUICommandResult, GameUICommands } from '../bridge/commands';

export function useGameSnapshot<T>(selector: (snapshot: GameUISnapshot) => T): T {
  const bridge = useGameUIBridge();
  return useSyncExternalStore(
    bridge.subscribe,
    () => selector(bridge.getSnapshot()),
    () => selector(bridge.getSnapshot())
  );
}

export function useGameCommand(): GameUICommands & { dispatchAction: (action: GameAction) => GameUICommandResult } {
  const bridge = useGameUIBridge();
  return {
    ...bridge.commands,
    dispatchAction: bridge.dispatchAction
  };
}

export function useUISetting<K extends keyof GameUISnapshot['settings']>(key: K): GameUISnapshot['settings'][K] {
  return useGameSnapshot((snapshot) => snapshot.settings[key]);
}

export function useWindowState(windowId: ManagedWindowId): ReturnType<typeof selectWindowLayout> {
  const bridge = useGameUIBridge();
  return useSyncExternalStore(
    bridge.subscribe,
    () => selectWindowLayout(bridge.getState(), windowId),
    () => selectWindowLayout(bridge.getState(), windowId)
  );
}
