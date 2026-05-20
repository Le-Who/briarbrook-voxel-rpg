import { areas } from '../data/areas';
import { createInitialEconomyState } from '../data/economy';
import { housingPieceDefinitions, housingTierDefinitions } from '../data/housing';
import { buildPieces, itemDefs } from '../data/items';
import { masteryMilestones, professionClusters, professionContracts } from '../data/professions';
import { createInitialQuests } from '../data/quests';
import { recipes } from '../data/recipes';
import { createInitialResourceTiles } from '../data/resourceMaps';
import { resourceNodeDefs, resourcePlacements } from '../data/resources';
import { areaZoneTypes, zoneRules } from '../data/riskZones';
import { skillDefinitions } from '../data/skillDefinitions';
import { spellDefs } from '../data/spells';
import { lockDefinitions, secretDefinitions, trapDefinitions, treasureLootTables, treasureMapDefinitions } from '../data/treasure';
import { visualPrefabs } from '../data/visualPrefabs';
import { createDefaultHotbar, createInitialEntities } from '../game/GameState';
import type { AreaId, GameState, MapWaypointSource, Vec3 } from '../game/types';
import { livingWorldEventDefinitions } from '../systems/LivingWorldSystem';

export interface ContentMapMarkerDefinition {
  id: string;
  areaId: AreaId;
  label: string;
  position: Vec3;
  source: MapWaypointSource;
}

export type ContentEventDefinition = (typeof livingWorldEventDefinitions)[keyof typeof livingWorldEventDefinitions];

export interface ContentRegistry {
  areas: typeof areas;
  items: typeof itemDefs;
  buildPieces: typeof buildPieces;
  recipes: typeof recipes;
  spells: typeof spellDefs;
  skills: typeof skillDefinitions;
  professions: {
    clusters: typeof professionClusters;
    milestones: typeof masteryMilestones;
    contracts: typeof professionContracts;
  };
  resources: typeof resourceNodeDefs;
  resourcePlacements: typeof resourcePlacements;
  resourceTiles: ReturnType<typeof createInitialResourceTiles>;
  quests: ReturnType<typeof createInitialQuests>;
  entities: GameState['entities'];
  events: ContentEventDefinition[];
  mapMarkers: ContentMapMarkerDefinition[];
  economy: GameState['world']['economy'];
  housing: {
    tiers: typeof housingTierDefinitions;
    pieces: typeof housingPieceDefinitions;
  };
  riskZones: {
    areaZones: typeof areaZoneTypes;
    rules: typeof zoneRules;
  };
  treasure: {
    maps: typeof treasureMapDefinitions;
    secrets: typeof secretDefinitions;
    locks: typeof lockDefinitions;
    traps: typeof trapDefinitions;
    lootTables: typeof treasureLootTables;
  };
  hotbarDefaults: ReturnType<typeof createDefaultHotbar>;
  visualPrefabs: typeof visualPrefabs;
}

export function createContentRegistry(state?: GameState): ContentRegistry {
  return {
    areas,
    items: itemDefs,
    buildPieces,
    recipes,
    spells: spellDefs,
    skills: skillDefinitions,
    professions: {
      clusters: professionClusters,
      milestones: masteryMilestones,
      contracts: professionContracts
    },
    resources: resourceNodeDefs,
    resourcePlacements,
    resourceTiles: state?.world.resourceTiles ?? createInitialResourceTiles(),
    quests: state?.quests ?? createInitialQuests(),
    entities: state?.entities ?? createInitialEntities(),
    events: Object.values(livingWorldEventDefinitions),
    mapMarkers: createMapMarkerDefinitions(),
    economy: state?.world.economy ?? createInitialEconomyState(),
    housing: {
      tiers: housingTierDefinitions,
      pieces: housingPieceDefinitions
    },
    riskZones: {
      areaZones: areaZoneTypes,
      rules: zoneRules
    },
    treasure: {
      maps: treasureMapDefinitions,
      secrets: secretDefinitions,
      locks: lockDefinitions,
      traps: trapDefinitions,
      lootTables: treasureLootTables
    },
    hotbarDefaults: createDefaultHotbar(),
    visualPrefabs
  };
}

export function exportContentSnapshot(registry: ContentRegistry = createContentRegistry()): string {
  return JSON.stringify(
    {
      areas: Object.values(registry.areas),
      items: Object.values(registry.items),
      buildPieces: registry.buildPieces,
      recipes: registry.recipes,
      spells: Object.values(registry.spells),
      skills: registry.skills,
      professions: registry.professions,
      resources: Object.values(registry.resources),
      resourcePlacements: registry.resourcePlacements,
      quests: Object.values(registry.quests),
      events: registry.events,
      mapMarkers: registry.mapMarkers,
      vendors: Object.values(registry.entities)
        .filter((entity) => (entity.kind === 'npc' || entity.kind === 'social') && entity.tradeInventory)
        .map((entity) => ({
          id: entity.id,
          name: entity.name,
          role: entity.kind === 'npc' || entity.kind === 'social' ? entity.role : undefined,
          inventory: entity.kind === 'npc' || entity.kind === 'social' ? entity.tradeInventory?.slots.filter(Boolean) : []
        })),
      economy: registry.economy,
      housing: registry.housing,
      riskZones: registry.riskZones,
      treasure: registry.treasure,
      hotbarDefaults: registry.hotbarDefaults,
      visualPrefabs: registry.visualPrefabs
    },
    null,
    2
  );
}

function createMapMarkerDefinitions(): ContentMapMarkerDefinition[] {
  return Object.values(areas).map((area) => ({
    id: `area_${area.id}_spawn`,
    areaId: area.id,
    label: area.name,
    position: area.spawn,
    source: 'manual'
  }));
}
