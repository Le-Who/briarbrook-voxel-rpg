import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createStabilityGateNewGame,
  giveStabilityGateKit,
  openEveryStabilityGatePanel,
  prepareStabilityGateState,
  runStabilityGateCommonActions,
  runStabilityGateHarness,
  runStabilityGateSaveLoadRoundTrip,
  stabilityGateMajorPanels,
  validateStabilityGateContent
} from './StabilityGateHarness';
import { AreaManager } from '../world/AreaManager';

describe('stability acceptance gate harness', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key)
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prepares a new-game gate kit and opens every major panel', () => {
    const state = createStabilityGateNewGame();

    giveStabilityGateKit(state);
    openEveryStabilityGatePanel(state);

    expect(state.player.inventory.slots.some((slot) => slot?.itemId === 'iron_bar')).toBe(true);
    expect(state.player.spellbook.knownSpellIds).toContain('fireball');
    expect(state.player.skills.Magery.value).toBeGreaterThanOrEqual(55);
    expect(stabilityGateMajorPanels.every((panel) => state.ui.panels[panel])).toBe(true);
    expect(validateStabilityGateContent(state).ok).toBe(true);
  });

  it('roundtrips player, inventory, bank, equipment, skills, spells, hotbar, quests, housing, and UI prefs', () => {
    const state = prepareStabilityGateState(new AreaManager());
    const { loaded, checks } = runStabilityGateSaveLoadRoundTrip(state);

    expect(checks.filter((entry) => !entry.ok)).toEqual([]);
    expect(loaded.player.currentArea).toBe('housing');
    expect(loaded.ui.reducedMotion).toBe(true);
    expect(loaded.world.placedBuildings.some((building) => building.pieceId === 'small_chest')).toBe(true);
  });

  it('simulates common focus, targeting, hotbar, pause, and dev-overlay actions without softlocks', () => {
    const state = prepareStabilityGateState(new AreaManager());
    const checks = runStabilityGateCommonActions(state);

    expect(checks.filter((entry) => !entry.ok)).toEqual([]);
    expect(state.realtime.actionQueue).toHaveLength(0);
  });

  it('runs the full scripted gate report green', () => {
    const report = runStabilityGateHarness();

    expect(report.ok).toBe(true);
    expect(report.checks.map((entry) => [entry.id, entry.ok])).toEqual(report.checks.map((entry) => [entry.id, true]));
  });
});
