import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { castSpellIntent } from '../systems/SpellSystem';
import { targetingPromptForTool } from '../systems/ResourceSystem';
import { pseudoLocalize, stringRegistry, terminologyWarningsForRegistry, text } from './Strings';

describe('string registry', () => {
  it('formats interpolated actionable error text', () => {
    expect(text('error.notEnoughMana', { spell: 'Heal', mana: 8 })).toBe(
      'Heal needs 8 mana. Drink a mana potion or meditate.'
    );
  });

  it('formats plural choices before simple interpolation', () => {
    expect(text('error.missingReagents', { count: 1, reagents: 'garlic' })).toBe(
      'Missing reagent: garlic. Restock before casting.'
    );
    expect(text('error.missingReagents', { count: 2, reagents: 'garlic, ginseng' })).toBe(
      'Missing reagents: garlic, ginseng. Restock before casting.'
    );
  });

  it('keeps core player verbs registered', () => {
    expect(text('action.equip')).toBe('Equip');
    expect(text('action.use')).toBe('Use');
    expect(text('action.cast')).toBe('Cast');
    expect(text('action.inspect')).toBe('Inspect');
    expect(text('action.gather')).toBe('Gather');
    expect(text('action.mine')).toBe('Mine');
    expect(text('action.chop')).toBe('Chop');
    expect(text('action.pickLock')).toBe('Pick Lock');
    expect(text('action.disarm')).toBe('Disarm');
  });

  it('flags internal terminology before strings reach the UI', () => {
    expect(terminologyWarningsForRegistry()).toEqual([]);
    const warnings = terminologyWarningsForRegistry({ bad: 'Select entityId node' });
    expect(warnings).toHaveLength(2);
    expect(warnings.join('\n')).toContain('entityId');
    expect(warnings.join('\n')).toContain('node');
  });

  it('supports pseudo-localized longer string checks', () => {
    const source = text('vendor.workOrderRequirement', {
      requester: 'Edda',
      quantity: 12,
      item: 'iron ingots',
      gold: 90
    });
    const pseudo = pseudoLocalize(source);

    expect(pseudo.length).toBeGreaterThan(source.length);
    expect(pseudo).not.toContain('{');
    expect(Object.keys(stringRegistry).length).toBeGreaterThan(20);
  });

  it('feeds common resource and spell prompts from centralized terminology', () => {
    expect(targetingPromptForTool('pickaxe')).toBe(text('prompt.selectMineTarget'));
    expect(targetingPromptForTool('axe')).toBe(text('prompt.selectTree'));

    const state = createInitialGameState();
    castSpellIntent(state, 'missing_spell');

    expect(state.ui.prompt).toBe(text('error.unknownSpell'));
  });
});
