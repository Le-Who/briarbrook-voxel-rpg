import { createContext, type ReactNode, useContext } from 'react';
import type { GameUIBridge } from './GameUIBridge';

const GameUIBridgeContext = createContext<GameUIBridge | null>(null);

export function GameUIBridgeProvider({ bridge, children }: { bridge: GameUIBridge; children: ReactNode }): ReactNode {
  return <GameUIBridgeContext.Provider value={bridge}>{children}</GameUIBridgeContext.Provider>;
}

export function useGameUIBridge(): GameUIBridge {
  const bridge = useContext(GameUIBridgeContext);
  if (!bridge) throw new Error('GameUIBridgeProvider is missing');
  return bridge;
}
