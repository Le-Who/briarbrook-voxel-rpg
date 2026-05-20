import type { GameAction } from '../../../game/Actions';
import type { GameState } from '../../../game/types';
import { createGameUICommands, type GameUICommandResult, type GameUICommands } from './commands';
import { createGameUISnapshot, type GameUISnapshot } from './selectors';

export interface GameUIBridgeSource {
  getState: () => GameState;
  dispatch: (action: GameAction) => void;
  subscribe: (listener: () => void) => () => void;
  getGame?: () => unknown;
}

export interface GameUIBridge {
  getSnapshot: () => GameUISnapshot;
  getState: () => GameState;
  subscribe: (listener: () => void) => () => void;
  dispatch: (action: GameAction) => void;
  dispatchAction: (action: GameAction) => GameUICommandResult;
  getGame: () => unknown | null;
  commands: GameUICommands;
}

export function createGameUIBridge(source: GameUIBridgeSource): GameUIBridge {
  let version = 0;
  let cachedVersion = -1;
  let cachedSnapshot: GameUISnapshot | null = null;

  const bridge: GameUIBridge = {
    getSnapshot: () => {
      if (!cachedSnapshot || cachedVersion !== version) {
        cachedSnapshot = createGameUISnapshot(source.getState());
        cachedVersion = version;
      }
      return cachedSnapshot;
    },
    getState: () => source.getState(),
    subscribe: (listener) =>
      source.subscribe(() => {
        version += 1;
        cachedSnapshot = null;
        listener();
      }),
    dispatch: (action) => {
      source.dispatch(action);
    },
    dispatchAction: (action) => {
      source.dispatch(action);
      return { accepted: true, action };
    },
    getGame: () => source.getGame?.() ?? null,
    commands: undefined as unknown as GameUICommands
  };

  bridge.commands = createGameUICommands(bridge);
  return bridge;
}
