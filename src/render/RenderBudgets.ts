import type { RenderStatsState } from '../game/types';

export const renderPerformanceBudget = {
  roughDrawCalls: 450,
  meshCount: 1200,
  visibleEntityCount: 160,
  raycastCandidateCount: 900,
  triangles: 140000,
  estimatedFrameMs: 16.7,
  memoryAfterTransitionMb: 180,
  domNodeCount: 1800,
  visibleWindowCount: 8,
  cachedIconCount: 260,
  eventListenerCount: 48
};

export const assetPerformanceBudget = {
  uniqueEquipmentModelsInMemory: 24,
  maxIconTextureSize: 64,
  maxParticleCount: 90,
  maxDynamicLights: 3,
  normalPlayDrawCalls: renderPerformanceBudget.roughDrawCalls,
  normalPlayFrameMs: renderPerformanceBudget.estimatedFrameMs
};

export function createInitialRenderStats(): RenderStatsState {
  return {
    frame: 0,
    fps: 0,
    frameTimeMs: 0,
    entityCount: 0,
    visibleEntityCount: 0,
    roughDrawCalls: 0,
    triangles: 0,
    meshCount: 0,
    staticMeshCount: 0,
    entityMeshCount: 0,
    effectMeshCount: 0,
    instancedMeshCount: 0,
    instancedInstanceCount: 0,
    materialCount: 0,
    geometryCount: 0,
    raycastCandidateCount: 0,
    estimatedFrameMs: 0,
    memoryAfterTransitionMb: null,
    domNodeCount: 0,
    visibleWindowCount: 0,
    iconRenderRequestCount: 0,
    cachedIconCount: 0,
    eventListenerCount: 0,
    budget: { ...renderPerformanceBudget }
  };
}

export function estimateRenderFrameMs(stats: {
  roughDrawCalls: number;
  meshCount: number;
  triangles: number;
  raycastCandidateCount: number;
}): number {
  const estimate =
    4 +
    stats.roughDrawCalls * 0.012 +
    stats.meshCount * 0.0035 +
    (stats.triangles / 100000) * 2.2 +
    stats.raycastCandidateCount * 0.002;
  return Math.round(estimate * 10) / 10;
}

export function renderStatsWithinBudget(stats: RenderStatsState): { ok: boolean; failures: string[] } {
  const budget = stats.budget ?? renderPerformanceBudget;
  const checks: Array<[string, number, number]> = [
    ['draw calls', stats.roughDrawCalls, budget.roughDrawCalls],
    ['meshes', stats.meshCount, budget.meshCount],
    ['visible entities', stats.visibleEntityCount, budget.visibleEntityCount],
    ['raycast candidates', stats.raycastCandidateCount, budget.raycastCandidateCount],
    ['triangles', stats.triangles, budget.triangles],
    ['estimated frame ms', stats.estimatedFrameMs, budget.estimatedFrameMs],
    ['DOM nodes', stats.domNodeCount, budget.domNodeCount],
    ['visible windows', stats.visibleWindowCount, budget.visibleWindowCount],
    ['cached icons', stats.cachedIconCount, budget.cachedIconCount],
    ['event listeners', stats.eventListenerCount, budget.eventListenerCount]
  ];
  if (stats.memoryAfterTransitionMb != null) checks.push(['memory MB', stats.memoryAfterTransitionMb, budget.memoryAfterTransitionMb]);
  const failures = checks.filter(([, actual, max]) => actual > max).map(([label, actual, max]) => `${label}: ${actual} > ${max}`);
  return { ok: failures.length === 0, failures };
}
