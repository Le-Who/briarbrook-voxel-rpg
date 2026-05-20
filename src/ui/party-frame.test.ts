import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { hireCompanion, setCompanionCommand } from '../systems/CompanionSystem';
import { PartyFrame } from './PartyFrame';

describe('party frame UI', () => {
  it('stays absent with no companion so the normal HUD remains low-chrome', () => {
    const state = createInitialGameState();

    expect(PartyFrame(state)).toBe('');
  });

  it('renders companion vitals, role badge, command dropdown, and dismiss control', () => {
    const state = createInitialGameState();
    hireCompanion(state, 'npc_durnok_town', { role: 'healer' });
    setCompanionCommand(state, 'npc_durnok_town', 'assist');

    const html = PartyFrame(state);

    expect(html).toContain('party-frame');
    expect(html).toContain('Durnok');
    expect(html).toContain('data-companion-command');
    expect(html).toContain('<option value="assist" selected>');
    expect(html).toContain('role-healer');
    expect(html).toContain('data-action="dismiss-companion"');
    expect(html).toContain('Mana');
  });
});
