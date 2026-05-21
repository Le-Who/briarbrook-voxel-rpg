import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import type { EnemyEntity, ResourceNodeEntity } from '../game/types';
import { applyScreenshotParityPreset } from '../tools/screenshotParity';
import { resourceTileKey } from '../data/resourceMaps';
import { describeInteraction } from '../systems/InteractionAffordanceSystem';
import { AreaManager } from '../world/AreaManager';
import { adventureReferencePlan } from './AdventureReferencePlan';

describe('R2-R4 adventure reference contract', () => {
  it('defines distinct scene targets for road combat, forest gathering, and crypt combat', () => {
    expect(adventureReferencePlan.road.location).toBe('Old River Road');
    expect(adventureReferencePlan.road.phase14ReferenceIds).toEqual(['REF_143_OLD_RIVER_ROAD', 'REF_140_TRAVERSABLE_ROAD_FOREST']);
    expect(adventureReferencePlan.road.compositionZones.map((zone) => zone.id)).toEqual(expect.arrayContaining(['river-edge', 'fenced-combat-lane', 'combat-pocket', 'checkpoint-edge']));
    expect(adventureReferencePlan.road.combatLane.minReadableWidth).toBeGreaterThanOrEqual(6);
    expect(adventureReferencePlan.road.landmarks).toEqual(expect.arrayContaining(['roadside checkpoint', 'bandit warning sign', 'old bridge']));
    expect(adventureReferencePlan.road.feedback).toEqual(expect.arrayContaining(['target-frame', 'target-outline', 'slash-arc', 'damage-float']));
    expect(adventureReferencePlan.road.combatPockets.length).toBeGreaterThanOrEqual(3);
    expect(adventureReferencePlan.road.dynamicLightBudget).toBeLessThanOrEqual(3);

    expect(adventureReferencePlan.forest.location).toBe('Greymont Forest');
    expect(adventureReferencePlan.forest.phase14ReferenceIds).toEqual(['REF_143_GREYMONT_FOREST', 'REF_140_TRAVERSABLE_ROAD_FOREST']);
    expect(adventureReferencePlan.forest.compositionZones.map((zone) => zone.id)).toEqual(expect.arrayContaining(['mine-approach', 'gathering-clearing', 'town-road-bridge', 'forest-understory']));
    expect(adventureReferencePlan.forest.resourceResponses).toEqual(['Chop', 'Protected', 'Depleted', 'Too small/shrub']);
    expect(adventureReferencePlan.forest.landmarks).toEqual(expect.arrayContaining(['mine entrance', 'ore nodes', 'hunter camp supplies']));
    expect(adventureReferencePlan.forest.pathNetwork.length).toBeGreaterThanOrEqual(4);
    expect(adventureReferencePlan.forest.permanentResourceLabels).toBe(false);

    expect(adventureReferencePlan.crypt.location).toBe('Forgotten Crypt');
    expect(adventureReferencePlan.crypt.phase14ReferenceIds).toEqual(['REF_144_CRYPT_COMBAT', 'REF_144_CRYPT_SECRET']);
    expect(adventureReferencePlan.crypt.compositionZones.map((zone) => zone.id)).toEqual(expect.arrayContaining(['entrance-threshold', 'combat-chamber', 'secret-reliquary', 'altar-niche']));
    expect(adventureReferencePlan.crypt.roomShapes.length).toBeGreaterThanOrEqual(3);
    expect(adventureReferencePlan.crypt.props).toEqual(expect.arrayContaining(['cracked floors', 'torch pools', 'pillars', 'bones', 'sarcophagus', 'altar']));
    expect(adventureReferencePlan.crypt.secretScene.interactionEntities).toEqual(expect.arrayContaining(['secret_crypt_loose_wall_cache', 'chest_crypt_warded', 'secret_crypt_false_door']));
    expect(adventureReferencePlan.crypt.lighting.torchPools.length).toBeGreaterThanOrEqual(5);
    expect(adventureReferencePlan.crypt.feedback).toEqual(expect.arrayContaining(['target-frame', 'target-outline', 'loot-nearby-label', 'modest-spell-vfx']));
    expect(adventureReferencePlan.crypt.dynamicLightBudget).toBeLessThanOrEqual(3);
  });

  it('sets R2/R3/R4 screenshot parity as actual readable gameplay states', () => {
    const areaManager = new AreaManager();

    const road = createInitialGameState();
    expect(applyScreenshotParityPreset(road, areaManager, 'r2-road-combat')).toBe(true);
    const bandit = road.entities.enemy_bandit_1 as EnemyEntity;
    expect(road.player.currentArea).toBe('road');
    expect(road.player.activeTargetId).toBe('enemy_bandit_1');
    expect(bandit.health).toBeLessThan(bandit.maxHealth);
    expect(road.visualEffects.some((effect) => effect.kind === 'slash_arc' && effect.area === 'road')).toBe(true);
    expect(road.floatingTexts.some((text) => text.text === '13')).toBe(true);
    expect(road.ui.activeHotbarSlot).toBe(0);
    expect(road.ui.panels.inventory).toBe(false);
    expect(road.ui.panels.status).toBe(false);

    const crypt = createInitialGameState();
    expect(applyScreenshotParityPreset(crypt, areaManager, 'r3-crypt-combat')).toBe(true);
    const skeleton = crypt.entities.enemy_skel_1 as EnemyEntity;
    expect(crypt.player.currentArea).toBe('crypt');
    expect(crypt.player.activeTargetId).toBe('enemy_skel_1');
    expect(skeleton.health).toBeLessThan(skeleton.maxHealth);
    expect(crypt.visualEffects.some((effect) => effect.kind === 'hit_impact' && effect.area === 'crypt')).toBe(true);
    expect(Object.values(crypt.entities).some((entity) => entity.kind === 'loot' && entity.area === 'crypt')).toBe(true);
    expect(crypt.ui.panels.inventory).toBe(true);
    expect(crypt.ui.panels.spellbook).toBe(true);
    expect(crypt.ui.panels.status).toBe(false);

    const forest = createInitialGameState();
    expect(applyScreenshotParityPreset(forest, areaManager, 'r4-forest-gathering')).toBe(true);
    const gathering = forest.gathering;
    const tree = forest.entities.res_tree_5 as ResourceNodeEntity;
    expect(forest.player.currentArea).toBe('forest');
    expect(gathering?.entityId).toBe('res_tree_5');
    expect(Math.hypot(forest.player.position.x - tree.position.x, forest.player.position.z - tree.position.z)).toBeLessThanOrEqual(2.35);
    expect(forest.ui.activeHotbarSlot).toBe(6);
    expect(forest.ui.hoverTarget).toEqual({ kind: 'entity', entityId: 'res_tree_5' });
    expect(forest.ui.panels.inventory).toBe(true);
    expect(forest.ui.panels.status).toBe(false);
    expect(forest.visualEffects.some((effect) => effect.kind === 'wood_chips' && effect.area === 'forest')).toBe(true);
  });

  it('keeps every forest tree entity backed by ResourceMap and gives obvious tree responses', () => {
    const state = createInitialGameState();
    state.player.currentArea = 'forest';
    state.ui.targeting = { mode: 'tool', toolItemId: 'axe', prompt: 'Select a tree.' };

    const forestTrees = Object.values(state.entities).filter(
      (entity): entity is ResourceNodeEntity => entity.kind === 'resource' && entity.area === 'forest' && entity.resourceType === 'tree'
    );
    expect(forestTrees.length).toBeGreaterThanOrEqual(45);
    for (const tree of forestTrees) {
      const tile = state.world.resourceTiles[resourceTileKey(tree.area, tree.position.x, tree.position.z, 'tree')];
      expect(tile, tree.id).toBeTruthy();
      expect(describeInteraction(state, { kind: 'entity', entityId: tree.id })?.prompt).toContain('Chop');
    }

    const depleted = forestTrees[0];
    depleted.depleted = true;
    const depletedTile = state.world.resourceTiles[resourceTileKey(depleted.area, depleted.position.x, depleted.position.z, 'tree')];
    depletedTile.harvestsRemaining = 0;
    depletedTile.depletedUntil = state.clock + 30;
    expect(describeInteraction(state, { kind: 'entity', entityId: depleted.id })?.prompt).toContain('Depleted');

    const shrub = describeInteraction(state, { kind: 'tile', areaId: 'forest', position: { x: 0, y: 0, z: 0 } });
    expect(shrub?.valid).toBe(false);
    expect(shrub?.prompt).toContain('Too small/shrub');
  });
});
