import { describe, expect, it } from 'vitest';
import indexHtml from '../../index.html?raw';
import faviconSvg from '../../public/favicon.svg?raw';
import { createInitialGameState } from '../game/GameState';
import { Simulation } from '../game/Simulation';
import { SnapshotSerializer } from '../net/SnapshotSerializer';
import { interactContainer, revealMagicalContainers, unlockContainerWithSpell } from '../systems/ContainerSystem';
import { devAddGold, devCompleteQuestStep, devGiveSpell, devResetResources, devSetSkillValue, devSpawnEnemy, devSpawnItem, devSimulateTime } from '../systems/DevToolsSystem';
import { exportTelemetryJson, recordDamageDealt, recordDamageTaken, recordResourceYield, recordSkillGainTelemetry } from '../systems/TelemetrySystem';
import { AreaManager } from '../world/AreaManager';
import { createContentRegistry } from './ContentRegistry';
import { validateContent } from './ContentValidation';
import { createDevScenePresets } from './devScenes';
import { validateRuntimeContent } from './runtimeContentValidation';
import { applyScreenshotParityPreset, createScreenshotParityPresets } from './screenshotParity';

describe('production content tools', () => {
  it('validates the shipped content registry', () => {
    const state = createInitialGameState();
    const result = validateContent(createContentRegistry(state), state.clock);

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('keeps runtime content validation active through the lazy startup helper', async () => {
    const state = createInitialGameState();
    state.dev.contentValidation = {
      ok: false,
      errors: ['not checked'],
      warnings: [],
      checkedAt: -1
    };

    await validateRuntimeContent(state);

    expect(state.dev.contentValidation.ok).toBe(true);
    expect(state.dev.contentValidation.errors).toEqual([]);
    expect(state.dev.contentValidation.warnings).toEqual([]);
    expect(state.dev.contentValidation.checkedAt).toBe(state.clock);
  });

  it('links a static favicon so browser smoke does not add 404 noise', () => {
    expect(indexHtml).toContain('rel="icon"');
    expect(indexHtml).toContain('href="/favicon.svg"');
    expect(faviconSvg).toContain('<svg');
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

  it('provides dev-only screenshot parity presets for the visual references', () => {
    const presets = createScreenshotParityPresets();
    expect(presets.map((preset) => preset.id)).toEqual([
      'r1-town-square',
      'r2-road-combat',
      'r3-crypt-combat',
      'r3-crypt-secret',
      'r4-forest-gathering',
      'r5-smithy-crafting',
      'r6-bank-storage',
      'r7-housing-build',
      'r8-profession-atlas',
      'r9-adventure-map'
    ]);
    presets.forEach((preset) => {
      expect(preset.camera.zoom).toBeGreaterThanOrEqual(11);
      expect(preset.camera.zoom).toBeLessThanOrEqual(24);
      if (preset.id === 'r2-road-combat' || preset.id === 'r3-crypt-secret') {
        expect(preset.openPanels).toEqual([]);
      } else {
        expect(preset.openPanels.length).toBeGreaterThan(0);
      }
    });
  });

  it('applies screenshot parity without exposing normal-mode debug controls', () => {
    const state = createInitialGameState();
    const areaManager = new AreaManager();
    state.dev.overlay = true;
    state.ui.devTravel = true;

    const applied = applyScreenshotParityPreset(state, areaManager, 'r5-smithy-crafting');

    expect(applied).toBe(true);
    expect(state.dev.overlay).toBe(false);
    expect(state.ui.devTravel).toBe(false);
    expect(state.dev.screenshotParity.active).toBe(true);
    expect(state.dev.screenshotParity.presetId).toBe('r5-smithy-crafting');
    expect(state.player.currentArea).toBe('blacksmith');
    expect(state.world.time.phase).toBe('day');
    expect(state.ui.panels.crafting).toBe(true);
    expect(state.ui.panels.inventory).toBe(true);
    expect(state.ui.selectedStationType).toBe('forge');
  });

  it('loads screenshot parity mutators through dev actions on demand', async () => {
    const simulation = new Simulation(createInitialGameState());
    simulation.state.dev.overlay = true;
    simulation.dispatch({ type: 'DEV_APPLY_SCREENSHOT_PARITY', presetId: 'r8-profession-atlas' });

    simulation.update(simulation.state.realtime.fixedDelta);
    await waitFor(() => simulation.state.dev.screenshotParity.active);

    expect(simulation.state.dev.screenshotParity.presetId).toBe('r8-profession-atlas');
    expect(simulation.state.ui.panels.skills).toBe(true);

    simulation.dispatch({ type: 'DEV_CLEAR_SCREENSHOT_PARITY' });
    simulation.update(simulation.state.realtime.fixedDelta);
    await waitFor(() => !simulation.state.dev.screenshotParity.active);

    expect(simulation.state.dev.screenshotParity.presetId).toBeNull();
  });

  it('applies all reference presets with short HUD prompts instead of capture debug text', () => {
    const expectedPrompts: Record<string, string> = {
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

    for (const preset of createScreenshotParityPresets()) {
      const state = createInitialGameState();
      const areaManager = new AreaManager();
      state.dev.overlay = true;
      state.ui.devTravel = true;

      expect(applyScreenshotParityPreset(state, areaManager, preset.id)).toBe(true);
      expect(state.dev.overlay).toBe(false);
      expect(state.ui.devTravel).toBe(false);
      expect(state.dev.screenshotParity.active).toBe(true);
      expect(state.dev.screenshotParity.referenceId).toBe(preset.referenceId);
      expect(state.ui.chatMode).toBe('expanded');
      expect(state.ui.prompt).toBe(expectedPrompts[preset.id]);
      expect(state.ui.prompt).not.toContain('Screenshot parity');
    }
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

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  expect(predicate()).toBe(true);
}
