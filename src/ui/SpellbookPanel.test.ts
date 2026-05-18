import { describe, expect, it } from 'vitest';
import { spellDefs } from '../data/spells';
import { createInitialGameState } from '../game/GameState';
import { SpellbookPanel } from './SpellbookPanel';

describe('SpellbookPanel information architecture', () => {
  it('defaults normal casting to known spells with compact cards and full details separately', () => {
    const state = createInitialGameState();
    state.ui.panels.spellbook = true;
    state.player.spellbook.knownSpellIds = ['magic_arrow', 'heal'];
    state.ui.selectedSpellId = 'magic_arrow';

    const html = SpellbookPanel(state);

    expect(html).toContain('data-spellbook-filter="known"');
    expect(html).toContain('Magic Arrow');
    expect(html).toContain('Heal');
    expect(html).not.toContain('Fireball');
    expect(html).toContain('Assign to Hotbar');
    expect(html).toContain('A fast blue-white projectile for light damage.');
  });

  it('keeps unknown spells out of normal casting noise and hides exact details in unknown view', () => {
    const state = createInitialGameState();
    state.ui.panels.spellbook = true;
    state.player.spellbook.knownSpellIds = ['magic_arrow'];
    state.ui.spellbookKnowledgeFilter = 'unknown';

    const html = SpellbookPanel(state);

    expect(html).toContain('Unknown Spell');
    expect(html).not.toContain('Magic Arrow</span>');
    expect(html).not.toContain('A heavy orange projectile with impact damage.');
  });

  it('searches spell words, roles, circles and reagent names', () => {
    const state = createInitialGameState();
    state.ui.panels.spellbook = true;
    state.player.spellbook.knownSpellIds = ['magic_arrow'];
    state.ui.spellbookKnowledgeFilter = 'all';
    state.ui.spellbookSearch = 'sulfurous';

    const html = SpellbookPanel(state);

    expect(html).toContain('Magic Arrow');
    expect(html).toContain('Fireball');
    expect(html).not.toContain('Heal</span>');
  });

  it('does not show stale selected spell details when filters have no results', () => {
    const state = createInitialGameState();
    state.ui.panels.spellbook = true;
    state.player.spellbook.knownSpellIds = Object.keys(spellDefs);
    state.ui.selectedSpellId = 'magic_arrow';
    state.ui.spellbookKnowledgeFilter = 'unknown';

    const html = SpellbookPanel(state);

    expect(html).toContain('No spells match.');
    expect(html).toContain('No spell selected');
    expect(html).not.toContain('A fast blue-white projectile for light damage.');
    expect(html).not.toContain('Assign to Hotbar');
  });
});
