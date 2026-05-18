import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { Simulation } from '../game/Simulation';
import { getItemCount } from '../systems/InventorySystem';
import { GuidePanel } from './GuidePanel';
import { Hotbar } from './Hotbar';
import { JournalPanel } from './JournalPanel';

describe('onboarding UI', () => {
  it('starts with a focused first step instead of opening advanced panels', () => {
    const state = createInitialGameState();

    expect(state.player.activeQuestIds).toEqual(['prepare_for_road']);
    expect(state.ui.panels.guide).toBe(true);
    expect(state.ui.panels.quest).toBe(false);
    expect(state.ui.panels.inventory).toBe(false);
    expect(state.ui.panels.help).toBe(false);
    expect(state.ui.panels.status).toBe(false);
    const guide = GuidePanel(state);
    expect(guide).toContain('Talk to Mira');
    expect((guide.match(/class="guide-step/g) ?? []).length).toBeLessThanOrEqual(3);
  });

  it('renders journal entries from discovered play state', () => {
    const state = createInitialGameState();
    state.ui.panels.journal = true;
    state.ui.panels.skills = true;
    state.world.discoveredAreas.push('bank');

    const html = JournalPanel(state);

    expect(html).toContain('Active Quests');
    expect(html).toContain('First Hour Route');
    expect(html).toContain('Next: Talk to Mira at the fountain');
    expect(html).toContain('Skills touched 0/12');
    expect(html).toContain('Discovered Mechanics');
    expect(html).toContain('Briarbrook Bank');
    expect(html).toContain('Skills');
  });

  it('points from the first tree gather toward the pickaxe loop', () => {
    const state = createInitialGameState();
    state.quests.prepare_for_road.objectives.forEach((objective) => {
      if (objective.type === 'talk' || objective.type === 'open_panel' || objective.type === 'gather') objective.progress = objective.required;
    });
    state.ui.panels.inventory = true;

    const guide = GuidePanel(state);

    expect(guide).toContain('Use a pickaxe on a mine rock');
    expect((guide.match(/class="guide-step/g) ?? []).length).toBeLessThanOrEqual(3);
  });

  it('uses functional default hotbar bindings for consumables and tools', () => {
    const state = createInitialGameState();
    const sim = new Simulation(state);
    state.player.health = 60;
    const potionsBefore = getItemCount(state.player.inventory, 'health_potion');

    expect(Hotbar(state)).toContain('Night Sight');
    sim.dispatch({ type: 'USE_HOTBAR', slot: 3 });
    sim.update(1 / 30);

    expect(state.player.health).toBeGreaterThan(60);
    expect(getItemCount(state.player.inventory, 'health_potion')).toBe(potionsBefore - 1);

    sim.dispatch({ type: 'USE_HOTBAR', slot: 6 });
    sim.update(1 / 30);

    expect(state.ui.targeting?.toolItemId).toBe('axe');
  });
});
