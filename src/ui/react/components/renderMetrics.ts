import { useEffect } from 'react';

const reactRenderCounts: Record<string, number> = {};

export function useReactPanelRender(panelId: string): void {
  useEffect(() => {
    recordReactPanelRender(panelId);
  });
}

export function recordReactPanelRender(panelId: string, count = 1): void {
  reactRenderCounts[`react:${panelId}`] = (reactRenderCounts[`react:${panelId}`] ?? 0) + count;
}

export function consumeReactRenderCounts(): Record<string, number> {
  const snapshot = { ...reactRenderCounts };
  Object.keys(reactRenderCounts).forEach((key) => {
    delete reactRenderCounts[key];
  });
  return snapshot;
}
