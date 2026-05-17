import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { SnapshotSerializer } from '../net/SnapshotSerializer';
import { interactContainer, revealMagicalContainers, unlockContainerWithSpell } from '../systems/ContainerSystem';
import { devAddGold, devCompleteQuestStep, devGiveSpell, devResetResources, devSetSkillValue, devSpawnEnemy, devSpawnItem, devSimulateTime } from '../systems/DevToolsSystem';
import { exportTelemetryJson, recordDamageDealt, recordDamageTaken, recordResourceYield, recordSkillGainTelemetry } from '../systems/TelemetrySystem';
import { AreaManager } from '../world/AreaManager';
import { createContentRegistry } from './ContentRegistry';
import { validateContent } from './ContentValidation';
import { createDevScenePresets } from './devScenes';

describe('production content tools', () => {
  it('validates the shipped content registry', () => {
    const state = createInitialGameState();
    const result = validateContent(createContentRegistry(state), state.clock);

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('catches missing item references in recipes', () => {
    const state = createInitialGameState();
    const registry = createContentRegistry(state);
    const result = validateContent({
      ...registry,
      recipes: [
        ...registry.recipes,
        {
          ...registry.recipes[0],
          id: 'bad_recipe',
          inputs: [{ itemId: 'missing_item', quantity: 1 }],
          requirements: [{ itemId: 'missing_item', quantity: 1 }]
        }
      ]
    });

    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes('missing_item'))).toBe(true);
  });

  it('provides isolated dev scene presets for fast content checks', () => {
    const scenes = createDevScenePresets();
    expect(scenes.map((scene) => scene.id)).toEqual([
      'combat_arena',
      'resource_grove',
      'crafting_lab',
      'spell_lab',
      'building_sandbox',
      'pathfinding_test'
    ]);
  });

  it('roundtrips a player snapshot without volatile queues', () => {
    const state = createInitialGameState();
    state.realtime.actionQueue.push({ id: 'queued', actorId: 'player', action: { type: 'MOVE_BY', dx: 1, dz: 0 }, createdAt: 0 });

    const restored = SnapshotSerializer.deserialize(SnapshotSerializer.serialize(state)).state;

    expect(restored.player.id).toBe('player');
    expect(restored.realtime.actionQueue).toHaveLength(0);
    expect(restored.world.economy.marketOrders.length).toBeGreaterThan(0);
  });

  it('records balancing telemetry and exports it as JSON', () => {
    const state = createInitialGameState();
    recordDamageDealt(state, 'melee', 12);
    recordDamageTaken(state, 5);
    recordSkillGainTelemetry(state, 'Swordsmanship', 0.2);
    recordResourceYield(state, 'iron_ore', 7);
    devAddGold(state, 42);

    const data = JSON.parse(exportTelemetryJson(state)) as { telemetry: { damageTaken: number; goldEarned: number; resourceYields: Record<string, number> } };

    expect(data.telemetry.damageTaken).toBe(5);
    expect(data.telemetry.goldEarned).toBe(42);
    expect(data.telemetry.resourceYields.iron_ore).toBe(7);
  });

  it('keeps dev tools hidden by default and mutates state only when invoked', () => {
    const state = createInitialGameState();
    const areaManager = new AreaManager();
    expect(state.dev.overlay).toBe(false);

    expect(devSpawnItem(state, 'iron_bar', 2)).toBe(true);
    expect(devSetSkillValue(state, 'Magery', 75)).toBe(true);
    expect(state.player.skills.Magery.value).toBe(75);
    devSpawnEnemy(state, 'Cultist');
    expect(Object.values(state.entities).some((entity) => entity.kind === 'enemy' && entity.name === 'Dev Cultist')).toBe(true);
    devResetResources(state);
    devGiveSpell(state, 'fireball');
    expect(state.player.spellbook.knownSpellIds).toContain('fireball');
    devSimulateTime(state, 'dusk');
    expect(state.world.time.phase).toBe('dusk');
    devCompleteQuestStep(state);
    areaManager.getSpawn(state.player.currentArea);
  });

  it('connects magic detection, lock handling, and the crypt reliquary quest step', () => {
    const state = createInitialGameState();
    state.player.currentArea = 'crypt';
    state.player.activeQuestIds.push('bones_beneath');
    const chest = state.entities.chest_crypt_warded;
    expect(chest?.kind).toBe('container');
    if (!chest || chest.kind !== 'container') return;

    const revealed = revealMagicalContainers(state);
    expect(revealed).toBeGreaterThan(0);
    expect(chest.trap?.detected).toBe(true);

    expect(unlockContainerWithSpell(state, { kind: 'entity', entityId: chest.id })).toBe(true);
    expect(chest.locked).toBe(false);
    if (chest.trap) chest.trap.armed = false;
    interactContainer(state, chest);

    expect(chest.opened).toBe(true);
    expect(state.quests.bones_beneath.objectives.find((objective) => objective.containerId === chest.id)?.progress).toBe(1);
  });
});
