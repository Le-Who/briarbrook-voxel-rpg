import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { Simulation } from '../game/Simulation';
import { addItem } from '../systems/InventorySystem';
import { triggerWorldEvent } from '../systems/LivingWorldSystem';
import { JournalPanel } from './JournalPanel';

describe('journal codex knowledge layer', () => {
  it('renders the required codex sections without exposing every advanced entry up front', () => {
    const state = createInitialGameState();
    state.ui.panels.journal = true;

    const html = JournalPanel(state);

    for (const section of ['current-objective', 'active-quests', 'discovered-mechanics', 'rumors', 'known-locations', 'profession-goals', 'recipes-learned', 'spells-learned', 'treasure-clues', 'housing-plans', 'completed-events']) {
      expect(html).toContain(`data-journal-section="${section}"`);
    }
    expect(html).toContain('Bandages');
    expect(html).not.toContain('Treasure Hunting</b>');
  });

  it('unlocks treasure knowledge through items and keeps entries actionable', () => {
    const state = createInitialGameState();
    state.ui.panels.journal = true;
    addItem(state.player.inventory, 'map_fragment', 1);

    const html = JournalPanel(state);

    expect(html).toContain('Treasure Hunting');
    expect(html).toContain('Treasure Clues');
    expect(html).toContain('Cartography');
    expect(html).toContain('Fragments hint at a buried cache');
  });

  it('pins real world rumors into the journal', () => {
    const state = createInitialGameState();
    const simulation = new Simulation(state);
    state.ui.panels.journal = true;
    const event = triggerWorldEvent(state, 'merchant_caravan');

    expect(JournalPanel(state)).toContain(`data-pin-rumor="${event.id}"`);

    simulation.dispatch({ type: 'PIN_RUMOR', eventId: event.id });
    simulation.update(1 / 30);
    const html = JournalPanel(state);

    expect(state.ui.pinnedRumorId).toBe(event.id);
    expect(html).toContain('Pinned Rumor');
    expect(html).toContain('class="pinned"');
  });

  it('keeps resolved world events visible after cleanup', () => {
    const state = createInitialGameState();
    state.ui.panels.journal = true;
    state.world.resolvedEventLog.push('Bandit Ambush on Old River Road: player response resolved - Roadhands report a bandit ambush forming on Old River Road.');

    const html = JournalPanel(state);

    expect(html).toContain('Completed Events');
    expect(html).toContain('Bandit Ambush on Old River Road');
    expect(html).toContain('player response resolved');
  });
});
