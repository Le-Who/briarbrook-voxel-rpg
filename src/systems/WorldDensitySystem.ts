import type { AreaId, Entity, GameState } from '../game/types';

export interface AreaDensitySummary {
  areaId: AreaId;
  meaningfulInteractions: number;
  landmarks: string[];
  servicesOrResources: string[];
  risksOrObstacles: string[];
  secretsOrSideInteractions: string[];
  revisitHooks: string[];
}

const densityAreaIds: AreaId[] = ['town', 'road', 'forest', 'crypt', 'housing'];

const staticRisks: Partial<Record<AreaId, string[]>> = {
  town: ['Guarded Safe Zone'],
  housing: ['Upgrade Requirements']
};

const staticRevisitHooks: Partial<Record<AreaId, string[]>> = {
  town: ['Market Board', 'Rumor Board', 'Housing Plot Ferry'],
  road: ['Caravan Demand', 'Guard Patrol'],
  forest: ['Ancient Yew', 'Mine to Crypt'],
  crypt: ['Warded Reliquary', 'Treasure Map Clue'],
  housing: ['Starter Resource Crate', 'Workbench Frame', 'Trophy Hook']
};

const sideInteractionNames = new Set([
  'Rumor Board',
  'Market Board',
  'Roadside Shrine',
  'Fresh Bandit Tracks',
  'Hunter Camp Supplies',
  'Trophy Hook',
  'Workbench Frame'
]);

export function summarizeWorldDensity(state: GameState): Record<AreaId, AreaDensitySummary> {
  const summaries = {} as Record<AreaId, AreaDensitySummary>;
  for (const areaId of densityAreaIds) {
    const entities = Object.values(state.entities).filter((entity) => entity.area === areaId);
    const landmarks = unique([
      ...entities.filter((entity) => entity.kind === 'portal').map((entity) => entity.name),
      ...entities.filter((entity) => entity.kind === 'container' && !entity.hidden).map((entity) => entity.name)
    ]);
    const servicesOrResources = unique([
      ...entities.filter(isServiceNpc).map((entity) => entity.name),
      ...entities.filter((entity) => entity.kind === 'resource').map((entity) => entity.name),
      ...entities.filter((entity) => entity.kind === 'container' && serviceContainer(entity)).map((entity) => entity.name)
    ]);
    const risksOrObstacles = unique([
      ...(staticRisks[areaId] ?? []),
      ...entities.filter((entity) => entity.kind === 'enemy').map((entity) => entity.name),
      ...entities.filter((entity) => entity.kind === 'container' && (entity.locked || Boolean(entity.trap) || entity.protected)).map((entity) => entity.name)
    ]);
    const secretsOrSideInteractions = unique([
      ...entities.filter((entity) => entity.kind === 'container' && (entity.hidden || entity.locked || entity.trap || sideInteractionNames.has(entity.name))).map((entity) => entity.name)
    ]);
    const revisitHooks = unique([
      ...(staticRevisitHooks[areaId] ?? []),
      ...entities.filter((entity) => entity.kind === 'resource').map((entity) => entity.name),
      ...entities.filter((entity) => entity.kind === 'npc' && (entity.training?.length || entity.tradeInventory)).map((entity) => entity.name)
    ]);
    const interactions = new Set([...landmarks, ...servicesOrResources, ...risksOrObstacles, ...secretsOrSideInteractions, ...revisitHooks]);
    summaries[areaId] = {
      areaId,
      meaningfulInteractions: interactions.size,
      landmarks,
      servicesOrResources,
      risksOrObstacles,
      secretsOrSideInteractions,
      revisitHooks
    };
  }
  return summaries;
}

function isServiceNpc(entity: Entity): boolean {
  if (entity.kind !== 'npc' && entity.kind !== 'social') return false;
  return Boolean(entity.tradeInventory || entity.training || ['banker', 'blacksmith', 'merchant', 'guard', 'quest'].includes(entity.role));
}

function serviceContainer(entity: Entity): boolean {
  if (entity.kind !== 'container') return false;
  return ['Supply', 'Cart', 'Crate', 'Workbench', 'Storage', 'Shrine', 'Board', 'Camp'].some((word) => entity.name.includes(word));
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
