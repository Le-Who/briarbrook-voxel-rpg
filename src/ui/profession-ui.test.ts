import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { JournalPanel } from './JournalPanel';
import { SkillsPanel } from './SkillsPanel';

describe('profession UI', () => {
  it('renders the skill ledger as the default skills view', () => {
    const state = createInitialGameState();
    state.ui.panels.skills = true;

    const html = SkillsPanel(state);

    expect(html).toContain('Skill Ledger');
    expect(html).toContain('Trained by');
    expect(html).toContain('Used by');
    expect(html).toContain('Trainable');
    expect(html).toContain('Not yet trainable');
  });

  it('renders the profession atlas as a planning map, not a passive tree', () => {
    const state = createInitialGameState();
    state.ui.panels.skills = true;
    state.ui.skillsViewMode = 'atlas';
    state.ui.skillProfessionFilter = 'treasure_hunter';
    state.ui.pinnedProfessionGoalId = 'skill:Lockpicking';

    const html = SkillsPanel(state);

    expect(html).toContain('Profession Atlas');
    expect(html).toContain('Treasure Hunter');
    expect(html).toContain('Cartography');
    expect(html).toContain('Treasure Map');
    expect(html).toContain('Not a passive tree');
    expect(html).toContain('not-trainable');
    expect(html).toContain('pinned');
  });

  it('renders mastery milestones and journal pinned profession goals', () => {
    const state = createInitialGameState();
    state.ui.panels.skills = true;
    state.ui.skillsViewMode = 'milestones';

    const skillsHtml = SkillsPanel(state);

    expect(skillsHtml).toContain('Mastery Milestones');
    expect(skillsHtml).toContain('Hedge Mage');
    expect(skillsHtml).toContain('Practice, no point spending');

    state.ui.panels.journal = true;
    state.ui.pinnedProfessionGoalId = 'profession:builder';
    const journalHtml = JournalPanel(state);

    expect(journalHtml).toContain('Pinned Profession Goal');
    expect(journalHtml).toContain('Builder');
  });
});
