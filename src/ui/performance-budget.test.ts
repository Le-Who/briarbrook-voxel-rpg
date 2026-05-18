import { describe, expect, it } from 'vitest';
import { itemDefs } from '../data/items';
import { createInitialGameState } from '../game/GameState';
import { renderIcon, iconCacheStats, resetIconCacheStatsForTests } from '../render/IconRenderer';
import { assetPerformanceBudget, createInitialRenderStats, renderPerformanceBudget, renderStatsWithinBudget } from '../render/RenderBudgets';
import { DevOverlay } from './DevOverlay';

describe('UI and render performance budget', () => {
  it('tracks UI, frame, icon and listener metrics in the render stats contract', () => {
    const stats = createInitialRenderStats();

    expect(stats.budget).toEqual(renderPerformanceBudget);
    expect(stats.fps).toBe(0);
    expect(stats.frameTimeMs).toBe(0);
    expect(stats.domNodeCount).toBe(0);
    expect(stats.visibleWindowCount).toBe(0);
    expect(stats.cachedIconCount).toBe(0);
    expect(stats.eventListenerCount).toBe(0);
    expect(assetPerformanceBudget.maxIconTextureSize).toBe(64);

    const result = renderStatsWithinBudget({
      ...stats,
      domNodeCount: renderPerformanceBudget.domNodeCount + 1,
      cachedIconCount: renderPerformanceBudget.cachedIconCount + 1
    });

    expect(result.ok).toBe(false);
    expect(result.failures.some((failure) => failure.includes('DOM nodes'))).toBe(true);
    expect(result.failures.some((failure) => failure.includes('cached icons'))).toBe(true);
  });

  it('caches icon markup while still counting render requests', () => {
    resetIconCacheStatsForTests();

    const first = renderIcon(itemDefs.iron_sword.icon, itemDefs.iron_sword.name, 'weapon');
    const second = renderIcon(itemDefs.iron_sword.icon, itemDefs.iron_sword.name, 'weapon');
    const stats = iconCacheStats();

    expect(second).toBe(first);
    expect(stats.iconRenderRequestCount).toBe(2);
    expect(stats.cachedIconCount).toBe(1);
  });

  it('exposes performance bottleneck rows in the dev overlay', () => {
    const state = createInitialGameState();
    state.dev.overlay = true;
    state.dev.renderStats = {
      ...state.dev.renderStats,
      fps: 58,
      frameTimeMs: 17.2,
      domNodeCount: 640,
      visibleWindowCount: 4,
      iconRenderRequestCount: 120,
      cachedIconCount: 52,
      eventListenerCount: 13
    };

    const html = DevOverlay(state);

    expect(html).toContain('FPS');
    expect(html).toContain('Frame time');
    expect(html).toContain('UI DOM');
    expect(html).toContain('Windows');
    expect(html).toContain('Icons');
    expect(html).toContain('Listeners');
  });
});
