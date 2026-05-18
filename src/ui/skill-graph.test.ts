import { describe, expect, it } from 'vitest';
import { masteryMilestones, professionClusters } from '../data/professions';
import { createInitialGameState } from '../game/GameState';
import { SkillsPanel } from './SkillsPanel';

describe('skill graph and profession clarity UI', () => {
  it('keeps the skill ledger as the authoritative use-based view', () => {
    const state = createInitialGameState();
    state.ui.panels.skills = true;
    state.ui.skillView = 'ledger';

    const html = SkillsPanel(state);

    expect(html).toContain('Skill Ledger');
    expect(html).toContain('Trainable now');
    expect(html).toContain('Build-relevant');
    expect(html).toContain('data-skill-mode="Swordsmanship"');
    expect(html).toContain('Trained by: melee-hit, melee-miss');
    expect(html).not.toContain('Spend Point');
  });

  it('renders a profession atlas with meaningful node types and profession pinning', () => {
    const state = createInitialGameState();
    state.ui.panels.skills = true;
    state.ui.skillView = 'atlas';
    state.ui.professionFilter = 'treasure_hunter';

    const html = SkillsPanel(state);

    expect(professionClusters.length).toBeGreaterThanOrEqual(6);
    expect(html).toContain('Profession Atlas');
    expect(html).toContain('Treasure Hunter');
    expect(html).toContain('data-atlas-skill="Cartography"');
    expect(html).toContain('data-atlas-action="Decipher Map"');
    expect(html).toContain('data-pin-profession-goal="treasure_hunter"');
  });

  it('renders mastery milestones as rewards earned by play state instead of level points', () => {
    const state = createInitialGameState();
    state.ui.panels.skills = true;
    state.ui.skillView = 'mastery';

    const html = SkillsPanel(state);

    expect(masteryMilestones.length).toBeGreaterThanOrEqual(12);
    expect(html).toContain('Mastery');
    expect(html).toContain('No level-point spending');
    expect(html).toContain('Market Helper');
  });
});
