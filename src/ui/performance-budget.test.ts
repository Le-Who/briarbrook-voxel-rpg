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
    expect(stats.perf.counters.uiRenderPerSecond).toBe(0);
    expect(stats.perf.subsystem.simulation.budgetMs).toBeGreaterThan(0);
    expect(stats.perf.tooltip.mountCount).toBe(0);
    expect(stats.perf.tooltip.currentAnchorId).toBeNull();
    expect(stats.loop.activityMode).toBe('ActiveGameplay');
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
      eventListenerCount: 16,
      perf: {
        ...state.dev.renderStats.perf,
        sampleWindowMs: 1000,
        avgFrameMs: 16.8,
        worstFrameMs: 24.1,
        longFramesPerSecond: 3,
        counters: {
          ...state.dev.renderStats.perf.counters,
          uiRenderPerSecond: 60,
          hudReplacementPerSecond: 5,
          minimapUpdatePerSecond: 60,
          tooltipSyncPerSecond: 140,
          raycastPerSecond: 8,
          pathfindingPerSecond: 1,
          activeTimers: 2
        },
        subsystem: {
          ...state.dev.renderStats.perf.subsystem,
          simulation: { ...state.dev.renderStats.perf.subsystem.simulation, callsPerSecond: 60, avgMs: 1.2 },
          renderer: { ...state.dev.renderStats.perf.subsystem.renderer, avgMs: 7.8 },
          ui: { ...state.dev.renderStats.perf.subsystem.ui, callsPerSecond: 60, avgMs: 4.4 }
        },
        windowRenderPerSecond: {
          inventory: 60,
          minimap: 60
        },
        tooltip: {
          mountCount: 3,
          unmountCount: 1,
          contentUpdateCount: 2,
          positionUpdateCount: 4,
          currentAnchorId: 'inv:0:iron_sword',
          lastHideReason: 'left anchor',
          lastShowReason: 'show delay elapsed'
        },
        dirty: {
          ...state.dev.renderStats.perf.dirty,
          hudChanged: true,
          minimapChanged: true
        }
      },
      loop: {
        ...state.dev.renderStats.loop,
        activityMode: 'InventoryOnly/Planning',
        cadence: {
          simulationHz: 5,
          renderHz: 15,
          uiHz: 20,
          minimapHz: 1,
          raycastHz: 8,
          animationPolicy: 'reduced'
        },
        dirtyFlags: {
          ...state.dev.renderStats.loop.dirtyFlags,
          inventoryDirty: true,
          minimapDirty: true
        },
        lastReason: 'dirty state'
      }
    };

    const html = DevOverlay(state);

    expect(html).toContain('FPS');
    expect(html).toContain('Frame time');
    expect(html).toContain('UI DOM');
    expect(html).toContain('Windows');
    expect(html).toContain('Icons');
    expect(html).toContain('Listeners');
    expect(html).toContain('Perf Counters');
    expect(html).toContain('UI renders');
    expect(html).toContain('Tooltip mount');
    expect(html).toContain('inv:0:iron_sword');
    expect(html).toContain('Ray/path');
    expect(html).toContain('Loop Governor');
    expect(html).toContain('InventoryOnly/Planning');
    expect(html).toContain('inventory');
  });
});
