import type { Vec3 } from '../game/types';

export interface TownSquareServiceEntrance {
  id: 'bank' | 'smithy' | 'market';
  label: string;
  signPosition: Vec3;
  servicePosition: Vec3;
  accent: string;
  detail: string;
}

export interface TownSquareExitSign {
  id: 'forest' | 'old-road' | 'ferry';
  label: string;
  position: Vec3;
  accent: string;
  detail: string;
}

export interface TownSquareDressingPoint {
  id: string;
  position: Vec3;
  accent?: string;
}

export interface TownSquareCompositionZone {
  id: 'central-plaza' | 'service-street' | 'market-side' | 'waterfront-ferry';
  label: string;
  anchor: Vec3;
  role: string;
}

export interface TownSquareBoardAnchor {
  id: 'rumor-board' | 'market-board';
  entityId: 'board_town_rumor' | 'board_town_market';
  label: string;
  position: Vec3;
  role: string;
}

export const briarbrookTownSquareReference = {
  referenceId: 'R1',
  phase14ReferenceIds: ['REF_142_TOWN_SQUARE_HERO', 'REF_142_TOWN_MARKET_STREET'],
  requiredSilhouettes: ['central fountain', 'market canopy', 'bank facade', 'smithy forge door', 'waterfront dock'],
  compositionZones: [
    {
      id: 'central-plaza',
      label: 'Town Square Plaza',
      anchor: { x: 0, y: 0, z: 0 },
      role: 'Fountain focal point, sparse NPC labels, and four clear outbound lanes.'
    },
    {
      id: 'service-street',
      label: 'Bank And Smithy Street',
      anchor: { x: -1, y: 0, z: -5 },
      role: 'Readable building fronts with bank and smithy doors flanking the southern plaza.'
    },
    {
      id: 'market-side',
      label: 'Market Board Street',
      anchor: { x: 8, y: 0, z: 6 },
      role: 'Work-order board, produce stalls, merchants, and crates without blocking the main road.'
    },
    {
      id: 'waterfront-ferry',
      label: 'Ferry And Dock Edge',
      anchor: { x: -15, y: 0, z: 13 },
      role: 'Visible water/dock context for the player plot ferry and western town edge.'
    }
  ] satisfies TownSquareCompositionZone[],
  centralLandmark: {
    id: 'fountain',
    label: 'Town Fountain',
    position: { x: 0, y: 0, z: 0 },
    clearRadius: 2.4
  },
  serviceEntrances: [
    {
      id: 'bank',
      label: 'Bank',
      signPosition: { x: -8, y: 0, z: -2 },
      servicePosition: { x: -7.2, y: 0, z: -2.8 },
      accent: '#2f5d93',
      detail: 'Safe storage entrance west of the square.'
    },
    {
      id: 'smithy',
      label: 'Smithy',
      signPosition: { x: 6, y: 0, z: -3 },
      servicePosition: { x: 6.7, y: 0, z: -3.6 },
      accent: '#c36b2c',
      detail: 'Forge and repair entrance east of the square.'
    },
    {
      id: 'market',
      label: 'Market',
      signPosition: { x: 8, y: 0, z: 5 },
      servicePosition: { x: 8.2, y: 0, z: 4.4 },
      accent: '#d6a33a',
      detail: 'Work orders and merchant wares beside the plaza.'
    }
  ] satisfies TownSquareServiceEntrance[],
  boardAnchors: [
    {
      id: 'rumor-board',
      entityId: 'board_town_rumor',
      label: 'Rumor Board',
      position: { x: 2, y: 0, z: 9 },
      role: 'Town leads on the north plaza approach.'
    },
    {
      id: 'market-board',
      entityId: 'board_town_market',
      label: 'Market Board',
      position: { x: 7, y: 0, z: 5 },
      role: 'Work orders on the market side without blocking the old-road lane.'
    }
  ] satisfies TownSquareBoardAnchor[],
  exitSigns: [
    {
      id: 'forest',
      label: 'Forest Road',
      position: { x: 0, y: 0, z: 15 },
      accent: '#5f8f48',
      detail: 'Northern road to Greymont Forest.'
    },
    {
      id: 'old-road',
      label: 'Old Road',
      position: { x: 14, y: 0, z: 5 },
      accent: '#8a7460',
      detail: 'Eastern road to bandit encounters.'
    },
    {
      id: 'ferry',
      label: 'Ferry',
      position: { x: -15, y: 0, z: 13 },
      accent: '#4f7d8b',
      detail: 'Docks and housing plot ferry.'
    }
  ] satisfies TownSquareExitSign[],
  npcBudget: {
    visibleSquareMin: 4,
    visibleSquareMax: 8,
    featuredNpcIds: ['npc_mira_town', 'npc_eldon_town', 'npc_brom_town', 'npc_torren_town', 'npc_sela_town', 'npc_liora_town']
  },
  dressing: {
    lamps: [
      { id: 'bank-lamp', position: { x: -8, y: 0, z: -2 } },
      { id: 'smith-lamp', position: { x: 6, y: 0, z: -3 } },
      { id: 'north-lamp', position: { x: 0, y: 0, z: 12 } },
      { id: 'road-lamp', position: { x: 13, y: 0, z: 4 } },
      { id: 'market-lamp', position: { x: 8, y: 0, z: 3 } },
      { id: 'dock-lamp', position: { x: -14, y: 0, z: 11 } }
    ] satisfies TownSquareDressingPoint[],
    flowerBeds: [
      { id: 'fountain-nw', position: { x: -4, y: 0, z: -2 }, accent: '#dfd8b1' },
      { id: 'fountain-ne', position: { x: 4, y: 0, z: -1 }, accent: '#cd584c' },
      { id: 'fountain-sw', position: { x: -4, y: 0, z: 4 }, accent: '#6f87d4' },
      { id: 'fountain-se', position: { x: 4, y: 0, z: 4 }, accent: '#e8bf4b' },
      { id: 'bank-bed', position: { x: -10, y: 0, z: -1 }, accent: '#dfd8b1' },
      { id: 'bank-door-bed', position: { x: -11, y: 0, z: -4 }, accent: '#6f87d4' },
      { id: 'smith-door-bed', position: { x: 8, y: 0, z: -4 }, accent: '#e8bf4b' },
      { id: 'market-bed', position: { x: 10, y: 0, z: 6 }, accent: '#cd584c' },
      { id: 'market-board-bed', position: { x: 6, y: 0, z: 8 }, accent: '#dfd8b1' },
      { id: 'dock-bed', position: { x: -12, y: 0, z: 9 }, accent: '#6f87d4' },
      { id: 'north-bed', position: { x: 2, y: 0, z: 10 }, accent: '#e8bf4b' },
      { id: 'ferry-bed', position: { x: -16, y: 0, z: 11 }, accent: '#dfd8b1' }
    ] satisfies TownSquareDressingPoint[],
    benches: [
      { id: 'west-bench', position: { x: -3, y: 0, z: 2 } },
      { id: 'east-bench', position: { x: 3, y: 0, z: -2 } },
      { id: 'market-bench', position: { x: 6, y: 0, z: 7 } },
      { id: 'ferry-bench', position: { x: -12, y: 0, z: 12 } }
    ] satisfies TownSquareDressingPoint[],
    banners: [
      { id: 'bank-banner', position: { x: -10, y: 0, z: -3 }, accent: '#1f5a95' },
      { id: 'square-banner', position: { x: -1, y: 0, z: 8 }, accent: '#1f5a95' },
      { id: 'road-banner', position: { x: 12, y: 0, z: 2 }, accent: '#1f5a95' }
    ] satisfies TownSquareDressingPoint[],
    marketStacks: [
      { id: 'produce-1', position: { x: 7, y: 0, z: 4 } },
      { id: 'produce-2', position: { x: 9, y: 0, z: 5 } },
      { id: 'produce-3', position: { x: 5, y: 0, z: 6 } },
      { id: 'produce-4', position: { x: 10, y: 0, z: 3 } },
      { id: 'produce-5', position: { x: 4, y: 0, z: 8 } }
    ] satisfies TownSquareDressingPoint[],
    shadeTrees: [
      { id: 'bank-yard-tree', position: { x: -4, y: 0, z: -8 }, accent: '#52763c' },
      { id: 'north-green-tree', position: { x: -3, y: 0, z: 10 }, accent: '#5b843c' },
      { id: 'ferry-garden-tree', position: { x: -13, y: 0, z: 10 }, accent: '#52763c' },
      { id: 'market-edge-tree', position: { x: 13, y: 0, z: 8 }, accent: '#6b8f3e' }
    ] satisfies TownSquareDressingPoint[],
    pathGuides: [
      { id: 'plaza-ring', position: { x: 0, y: 0, z: 0 }, accent: '#8d8272' },
      { id: 'bank-lane', position: { x: -5, y: 0, z: -2 }, accent: '#8f806c' },
      { id: 'smithy-lane', position: { x: 4, y: 0, z: -2 }, accent: '#8f806c' },
      { id: 'market-lane', position: { x: 6, y: 0, z: 4 }, accent: '#9b855a' },
      { id: 'forest-lane', position: { x: 0, y: 0, z: 10 }, accent: '#837969' },
      { id: 'old-road-lane', position: { x: 11, y: 0, z: 4 }, accent: '#837969' },
      { id: 'ferry-lane', position: { x: -11, y: 0, z: 10 }, accent: '#6e8792' }
    ] satisfies TownSquareDressingPoint[]
  },
  planningBudget: {
    drawCalls: 360,
    meshes: 950,
    triangles: 120000,
    visibleEntities: 120,
    raycastCandidates: 650
  }
} as const;
