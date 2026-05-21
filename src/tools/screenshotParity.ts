import type { GameState, WorldPhase } from '../game/types';
import { createStack } from '../game/GameState';
import { claimPlotAndRefreshBuild, updateBuildGhost } from '../systems/BuildingSystem';
import { faceEntityTowardPosition, facePlayerTowardEntity } from '../systems/FacingSystem';
import { addItem } from '../systems/InventorySystem';
import { triggerWorldEvent } from '../systems/LivingWorldSystem';
import { transitionPlayerToArea } from '../systems/TransitionSystem';
import type { AreaManager } from '../world/AreaManager';
import { findScreenshotParityPreset } from './screenshotParityPresets';
import type { ContainerEntity } from '../game/types';
export { createScreenshotParityPresets, findScreenshotParityPreset } from './screenshotParityPresets';
export type { ScreenshotParityPreset } from './screenshotParityPresets';

export function applyScreenshotParityPreset(state: GameState, areaManager: AreaManager, presetId: string): boolean {
  const preset = findScreenshotParityPreset(presetId);
  if (!preset) {
    state.ui.prompt = `Missing screenshot parity preset: ${presetId}.`;
    return false;
  }

  transitionPlayerToArea(state, areaManager, preset.area, { requestedSpawn: preset.playerPosition });
  state.dev.overlay = false;
  state.ui.devTravel = false;
  state.dev.selectedSceneId = preset.id;
  setWorldTimePhase(state, preset.timePhase);
  Object.keys(state.ui.panels).forEach((panel) => {
    state.ui.panels[panel] = false;
  });
  preset.openPanels.forEach((panel) => {
    state.ui.panels[panel] = true;
  });
  state.ui.windowLayouts = {};
  state.ui.windowFocusOrder = [];
  state.ui.minimapMode = preset.minimapMode ?? 'standard';
  state.ui.panels.map = preset.openPanels.includes('map') || state.ui.minimapMode === 'expanded';
  state.ui.chatMode = preset.chatMode ?? 'expanded';
  state.ui.selectedTarget = null;
  state.player.activeTargetId = preset.selectedTargetId ?? null;
  if (preset.selectedRecipeId) state.ui.selectedRecipeId = preset.selectedRecipeId;
  if (preset.skillView) state.ui.skillView = preset.skillView;
  if (preset.skillsViewMode) state.ui.skillsViewMode = preset.skillsViewMode;
  if (preset.secretFocusEntityId) state.ui.selectedTarget = { kind: 'entity', entityId: preset.secretFocusEntityId };
  if (preset.selectedBuildCategory) state.ui.selectedBuildCategory = preset.selectedBuildCategory;
  if (preset.area === 'housing') {
    state.buildMode.active = true;
    state.ui.panels.build = true;
    if (preset.selectedBuildPieceId) state.buildMode.selectedPieceId = preset.selectedBuildPieceId;
    if (preset.id === 'r7-housing-build') seedHousingBuildReferenceInventory(state);
    claimPlotAndRefreshBuild(state, areaManager);
    updateBuildGhost(state, areaManager, { ...preset.playerPosition, x: preset.playerPosition.x + 2 });
  } else {
    state.buildMode.active = false;
  }
  applyReferenceActionState(state, preset.id);
  state.dev.screenshotParity = {
    active: true,
    presetId: preset.id,
    referenceId: preset.referenceId,
    label: preset.label,
    captureName: `${preset.referenceId}-${preset.id}`,
    camera: {
      zoom: preset.camera.zoom,
      offset: { ...preset.camera.offset },
      focus: preset.camera.focus ? { ...preset.camera.focus } : { ...preset.playerPosition }
    },
    lastAppliedAt: state.clock
  };
  state.ui.prompt = referenceHudPrompt(preset.id);
  return true;
}

function applyReferenceActionState(state: GameState, presetId: string): void {
  state.visualEffects = [];
  state.projectiles = [];
  state.floatingTexts = [];
  state.combat.telegraphs = [];
  state.combat.hitFlashes = {};
  state.gathering = null;
  state.ui.hoverTarget = null;
  state.ui.selectedTarget = null;
  state.ui.activeHotbarSlot = 0;
  state.spellCasting = null;
  state.player.actionState = {
    kind: 'idle',
    startedAt: state.clock,
    duration: 0,
    endsAt: state.clock,
    interruptible: true,
    visualHint: 'idle'
  };

  if (presetId === 'r2-road-combat') applyRoadCombatReferenceState(state);
  if (presetId === 'r3-crypt-combat') applyCryptCombatReferenceState(state);
  if (presetId === 'r3-crypt-secret') applyCryptSecretReferenceState(state);
  if (presetId === 'r4-forest-gathering') applyForestGatheringReferenceState(state);
  if (presetId === 'r5-smithy-crafting') applySmithyCraftingReferenceState(state);
  if (presetId === 'r6-bank-storage') applyBankStorageReferenceState(state);
  if (presetId === 'r7-housing-build') applyHousingBuildReferenceState(state);
  if (presetId === 'r8-profession-atlas') applyProfessionAtlasReferenceState(state);
  if (presetId === 'r9-adventure-map') applyAdventureMapReferenceState(state);
}

function applyRoadCombatReferenceState(state: GameState): void {
  const target = state.entities.enemy_bandit_1;
  if (!target || target.kind !== 'enemy') return;
  target.health = Math.min(target.maxHealth - 1, 30);
  target.state = 'attack';
  state.player.health = Math.min(state.player.health, 96);
  state.player.activeTargetId = target.id;
  state.ui.selectedTarget = { kind: 'entity', entityId: target.id };
  state.ui.activeHotbarSlot = 0;
  state.combat.meleeCooldown = 0.42;
  state.combat.hitFlashes[target.id] = state.clock + 3;
  state.floatingTexts.push({ id: 'float_r2_damage', text: '13', position: { x: target.position.x, y: 1.25, z: target.position.z }, color: '#ff6d4a', age: 0, lifetime: 3 });
  state.visualEffects.push({
    id: 'vfx_r2_slash',
    kind: 'slash_arc',
    tier: 1,
    area: 'road',
    position: { ...state.player.position },
    targetPosition: { ...target.position },
    yaw: Math.atan2(target.position.x - state.player.position.x, target.position.z - state.player.position.z),
    color: '#ffd968',
    startedAt: state.clock,
    duration: 3
  });
  state.projectiles.push({
    id: 'proj_r2_arrow',
    kind: 'arrow',
    from: { x: 5, y: 0.7, z: 1 },
    to: { ...state.player.position, y: 0.7 },
    age: 0.42,
    duration: 3,
    color: '#d8d4c7'
  });
  facePlayerTowardEntity(state, target.id, 'target', 1.5);
  for (const id of ['enemy_bandit_1', 'enemy_bandit_2', 'enemy_brigand_1', 'npc_aric_road']) {
    const entity = state.entities[id];
    if (entity?.facing) faceEntityTowardPosition(entity, state.player.position, 'target', state.clock, 1.5);
  }
}

function applyCryptCombatReferenceState(state: GameState): void {
  const target = state.entities.enemy_skel_1;
  if (!target || target.kind !== 'enemy') return;
  target.health = Math.min(target.maxHealth - 1, 18);
  target.state = 'attack';
  state.player.health = Math.min(state.player.health, 92);
  state.player.activeTargetId = target.id;
  state.ui.selectedTarget = { kind: 'entity', entityId: target.id };
  state.ui.activeHotbarSlot = 2;
  state.combat.magicCooldown = 0.55;
  state.combat.hitFlashes[target.id] = state.clock + 3;
  state.visualEffects.push({
    id: 'vfx_r3_hit',
    kind: 'hit_impact',
    tier: 1,
    area: 'crypt',
    position: { ...target.position },
    color: '#ff7768',
    startedAt: state.clock,
    duration: 3
  });
  state.projectiles.push({
    id: 'proj_r3_magic_arrow',
    kind: 'magic_arrow',
    from: { ...state.player.position, y: 0.7 },
    to: { ...target.position, y: 0.7 },
    age: 0.56,
    duration: 3,
    color: '#7ad7ff'
  });
  state.floatingTexts.push({ id: 'float_r3_damage', text: '7', position: { x: target.position.x, y: 1.25, z: target.position.z }, color: '#ff6d4a', age: 0, lifetime: 3 });
  state.entities.loot_crypt_reference_gold = {
    id: 'loot_crypt_reference_gold',
    kind: 'loot',
    area: 'crypt',
    name: '8 Gold',
    position: { x: -1, y: 0, z: -1 },
    blocksMovement: false,
    gold: 8,
    expiresIn: 60
  };
  facePlayerTowardEntity(state, target.id, 'cast', 1.5);
  for (const id of ['enemy_skel_1', 'enemy_skel_2', 'enemy_skel_3', 'npc_liora_crypt']) {
    const entity = state.entities[id];
    if (entity?.facing) faceEntityTowardPosition(entity, state.player.position, 'target', state.clock, 1.5);
  }
}

function applyCryptSecretReferenceState(state: GameState): void {
  delete state.entities.loot_crypt_reference_gold;
  state.player.activeTargetId = null;
  state.ui.activeHotbarSlot = 8;
  state.ui.hoverTarget = { kind: 'entity', entityId: 'chest_crypt_warded' };
  state.ui.selectedTarget = { kind: 'entity', entityId: 'chest_crypt_warded' };
  state.ui.journalTab = 'rumors';
  const looseWall = state.entities.secret_crypt_loose_wall_cache as ContainerEntity;
  const reliquary = state.entities.chest_crypt_warded as ContainerEntity;
  const falseDoor = state.entities.secret_crypt_false_door as ContainerEntity;
  looseWall.hidden = false;
  reliquary.hidden = false;
  reliquary.locked = false;
  reliquary.opened = false;
  falseDoor.hidden = false;
  state.floatingTexts.push({ id: 'float_r3_secret_niche', text: 'Hidden Niche', position: { x: -8.4, y: 1.6, z: 5.2 }, color: '#f5d58a', age: 0, lifetime: 3 });
  state.floatingTexts.push({ id: 'float_r3_secret_chest', text: 'Warded Reliquary', position: { x: 4.8, y: 1.9, z: 5.5 }, color: '#f5d58a', age: 0, lifetime: 3 });
  state.floatingTexts.push({ id: 'float_r3_secret_altar', text: 'Altar', position: { x: -1.0, y: 1.4, z: -5.8 }, color: '#9edcff', age: 0, lifetime: 3 });
  state.visualEffects.push({
    id: 'vfx_r3_secret_glow',
    kind: 'rune_circle',
    tier: 1,
    area: 'crypt',
    position: { x: 0, y: 0.2, z: -8 },
    color: '#7ad7ff',
    startedAt: state.clock,
    duration: 3
  });
}

function applyForestGatheringReferenceState(state: GameState): void {
  const target = state.entities.res_tree_5;
  if (!target || target.kind !== 'resource') return;
  state.player.activeTargetId = null;
  state.ui.activeHotbarSlot = 6;
  state.ui.hoverTarget = { kind: 'entity', entityId: target.id };
  state.ui.selectedTarget = { kind: 'entity', entityId: target.id };
  state.gathering = {
    entityId: target.id,
    actionLabel: `Chopping ${target.name}`,
    startedAt: state.clock,
    duration: 2.05,
    remaining: 1.2
  };
  state.player.actionState = {
    kind: 'gathering',
    startedAt: state.clock,
    duration: 2.05,
    endsAt: state.clock + 2.05,
    interruptible: true,
    visualHint: 'toolSwing'
  };
  state.visualEffects.push({
    id: 'vfx_r4_wood_chips',
    kind: 'wood_chips',
    tier: 1,
    area: 'forest',
    position: { ...target.position },
    color: '#d29a5b',
    startedAt: state.clock,
    duration: 3
  });
  state.floatingTexts.push({ id: 'float_r4_wood', text: '+12 Wood', position: { x: target.position.x, y: 1.35, z: target.position.z }, color: '#e8f5be', age: 0, lifetime: 3 });
  facePlayerTowardEntity(state, target.id, 'gathering', 2.2);
}

function applySmithyCraftingReferenceState(state: GameState): void {
  state.ui.selectedStationType = 'forge';
  state.ui.selectedRecipeId = 'iron_armor';
  state.ui.craftQuantity = 1;
  addItem(state.player.inventory, 'iron_bar', 20);
  addItem(state.player.inventory, 'leather', 10);
  state.player.equipment.armor ??= createStack('leather_armor');
  if (state.player.equipment.armor?.maxDurability) {
    state.player.equipment.armor.durability = Math.max(1, Math.floor(state.player.equipment.armor.maxDurability * 0.45));
  }
  state.craftQueue = [
    {
      id: 'craft_reference_iron_armor',
      recipeId: 'iron_armor',
      quantity: 1,
      remaining: 8,
      total: 18
    }
  ];
  state.ui.hoverTarget = { kind: 'entity', entityId: 'npc_brom_smithy' };
  state.ui.selectedTarget = { kind: 'entity', entityId: 'npc_brom_smithy' };
  const brom = state.entities.npc_brom_smithy;
  if (brom?.facing) {
    facePlayerTowardEntity(state, brom.id, 'interact', 1.2);
    faceEntityTowardPosition(brom, state.player.position, 'interact', state.clock, 1.2);
  }
  state.visualEffects.push({
    id: 'vfx_r5_forge_glow',
    kind: 'craft_loop',
    tier: 2,
    area: 'blacksmith',
    position: { x: 2, y: 0, z: -2 },
    color: '#ff8a2e',
    startedAt: state.clock,
    duration: 3
  });
}

function applyBankStorageReferenceState(state: GameState): void {
  state.player.bankGold = Math.max(state.player.bankGold, 42);
  state.ui.selectedBankSlot = 0;
  state.ui.hoverTarget = { kind: 'entity', entityId: 'npc_eldon_bank' };
  state.ui.selectedTarget = { kind: 'entity', entityId: 'npc_eldon_bank' };
  if (!state.player.bank.slots.some(Boolean)) {
    state.player.bank.slots[0] = createStack('iron_sword');
    state.player.bank.slots[1] = createStack('axe');
    state.player.bank.slots[2] = createStack('pickaxe');
    state.player.bank.slots[3] = createStack('backpack');
    state.player.bank.slots[4] = createStack('cracked_shield');
    state.player.bank.slots[5] = createStack('iron_armor');
    state.player.bank.slots[6] = createStack('iron_boots');
    state.player.bank.slots[7] = createStack('repair_kit');
    state.player.bank.slots[8] = createStack('lockpick', 7);
    state.player.bank.slots[9] = createStack('health_potion', 4);
    state.player.bank.slots[10] = createStack('parchment_scroll', 20);
    state.player.bank.slots[11] = createStack('stone_block', 32);
  }
  const eldon = state.entities.npc_eldon_bank;
  if (eldon?.facing) {
    facePlayerTowardEntity(state, eldon.id, 'interact', 1.2);
    faceEntityTowardPosition(eldon, state.player.position, 'interact', state.clock, 1.2);
  }
}

function applyProfessionAtlasReferenceState(state: GameState): void {
  state.ui.skillView = 'atlas';
  state.ui.skillsViewMode = 'atlas';
  state.ui.professionFilter = 'smith_artisan';
  state.ui.skillProfessionFilter = 'town_smith';
  state.ui.selectedProfessionNodeId = 'skill_blacksmithing';
  state.ui.professionAtlasSearch = '';
  state.ui.professionAtlasShowFuture = true;
  state.ui.professionAtlasZoom = 0.9;
  state.ui.pinnedProfessionGoalId ??= null;
  addItem(state.player.inventory, 'pickaxe', 1);
  addItem(state.player.inventory, 'iron_ore', 10);
  addItem(state.player.inventory, 'iron_bar', 8);
}

function applyAdventureMapReferenceState(state: GameState): void {
  state.world.discoveredAreas = Array.from(new Set([...state.world.discoveredAreas, 'town', 'bank', 'blacksmith', 'forest', 'road', 'crypt', 'housing']));
  const rumor = triggerWorldEvent(state, 'merchant_caravan');
  state.ui.pinnedRumorId = rumor.id;
  addItem(state.player.inventory, 'rough_treasure_map', 1);
  const greymontMap = state.world.treasure.maps.greymont_cache;
  if (greymontMap) {
    greymontMap.pinned = true;
    greymontMap.decipheredPrecision = Math.max(greymontMap.decipheredPrecision ?? 0, 0.75);
  }
  state.ui.mapWaypoint = {
    areaId: 'forest',
    position: { x: 9, y: 0, z: -7 },
    label: 'Greymont treasure clue',
    source: 'treasure',
    setAt: state.clock
  };
  state.ui.mapHiddenLayers = [];
  state.ui.minimapMode = 'expanded';
  state.ui.panels.map = true;
}

function seedHousingBuildReferenceInventory(state: GameState): void {
  setReferenceInventoryStack(state, 'wood', 18);
  setReferenceInventoryStack(state, 'stone_block', 12);
  setReferenceInventoryStack(state, 'iron_bar', 4);
  setReferenceInventoryStack(state, 'logs', 6);
  setReferenceInventoryStack(state, 'clean_cloth', 4);
  setReferenceInventoryStack(state, 'leather', 3);
  setReferenceInventoryStack(state, 'crate_kit', 1);
  setReferenceInventoryStack(state, 'torch', 3);
}

function setReferenceInventoryStack(state: GameState, itemId: string, quantity: number): void {
  const existing = state.player.inventory.slots.find((stack) => stack?.itemId === itemId);
  if (existing) {
    existing.quantity = Math.max(existing.quantity, quantity);
    return;
  }
  const empty = state.player.inventory.slots.findIndex((slot) => !slot);
  const index = empty >= 0 ? empty : state.player.inventory.slots.length - 1;
  state.player.inventory.slots[index] = createStack(itemId, quantity);
}

function applyHousingBuildReferenceState(state: GameState): void {
  state.ui.selectedBuildCategory = 'Storage';
  state.buildMode.selectedPieceId = 'small_chest';
  state.buildMode.snapToGrid = true;
  state.buildMode.rotation = 90;
  state.ui.activeHotbarSlot = 6;
  state.ui.hoverTarget = null;
  state.ui.selectedTarget = null;
  state.ui.prompt = 'Plot — Build';
}

function referenceHudPrompt(presetId: string): string {
  const prompts: Record<string, string> = {
    'r1-town-square': '',
    'r2-road-combat': 'Highway Bandit — Target',
    'r3-crypt-combat': 'Skeletal Warrior — Target',
    'r3-crypt-secret': 'Warded Reliquary — Open',
    'r4-forest-gathering': 'Oak Tree — Chop',
    'r5-smithy-crafting': 'Brom — Craft/Repair',
    'r6-bank-storage': 'Banker — Open Bank',
    'r7-housing-build': 'Plot — Build',
    'r8-profession-atlas': '',
    'r9-adventure-map': ''
  };
  return prompts[presetId] ?? '';
}

export function clearScreenshotParityPreset(state: GameState): void {
  state.dev.screenshotParity = {
    active: false,
    presetId: null,
    referenceId: null,
    label: '',
    captureName: '',
    camera: {
      zoom: 17,
      offset: { x: 8.6, y: 10.2, z: 8.6 },
      focus: null
    },
    lastAppliedAt: state.clock
  };
  state.ui.prompt = 'Screenshot parity cleared.';
}

function setWorldTimePhase(state: GameState, phase: WorldPhase): void {
  const dayLength = state.world.time.dayLengthSeconds || 96;
  const offsets: Record<WorldPhase, number> = {
    dawn: 0.24,
    day: 0.36,
    dusk: 0.78,
    night: 0.92
  };
  const hourMap: Record<WorldPhase, number> = { dawn: 6, day: 12, dusk: 19, night: 22 };
  const day = Math.max(0, state.world.time.day);
  state.clock = day * dayLength + dayLength * offsets[phase];
  state.world.time = {
    ...state.world.time,
    timeOfDay: offsets[phase],
    hour: hourMap[phase],
    minute: 0,
    phase,
    visibilityModifier: phase === 'night' ? 0.58 : phase === 'dusk' ? 0.74 : phase === 'dawn' ? 0.82 : 1,
    stealthModifier: phase === 'night' ? 1.2 : phase === 'dusk' ? 1.1 : phase === 'dawn' ? 1.05 : 0.94,
    dangerModifier: phase === 'night' ? 1.1 : phase === 'dusk' ? 1.05 : 1
  };
}
