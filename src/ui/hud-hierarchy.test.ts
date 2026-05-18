import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { MarketBoardPanel } from './MarketBoardPanel';
import { SkillsPanel } from './SkillsPanel';

describe('HUD hierarchy and progressive disclosure defaults', () => {
  it('keeps the first-load HUD calm while preserving one-click depth', () => {
    const state = createInitialGameState();

    expect(state.ui.panels.guide).toBe(true);
    expect(state.ui.panels.market).toBe(false);
    expect(state.ui.panels.build).toBe(false);
    expect(state.ui.spellbookKnowledgeFilter).toBe('known');
    expect(state.ui.marketView).toBe('work');
    expect(state.player.selectedSkillGroup).toBe('Build-relevant');
  });

  it('opens Skills in a relevant summary instead of a full all-skills ledger', () => {
    const state = createInitialGameState();
    state.ui.panels.skills = true;

    const html = SkillsPanel(state);

    expect(html).toContain('Build-relevant');
    expect(html).not.toContain('No skills match.');
  });

  it('opens Market in available work-order mode before full trading complexity', () => {
    const state = createInitialGameState();
    state.ui.panels.market = true;

    const html = MarketBoardPanel(state);

    expect(html).toContain('market-mode-work');
    expect(html).toContain('Available Work Orders');
    expect(html).not.toContain('<h3>Buy Orders</h3>');
    expect(html).not.toContain('<h3>Sell Orders</h3>');
  });
});
