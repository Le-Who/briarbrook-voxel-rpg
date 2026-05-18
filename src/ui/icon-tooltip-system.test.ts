import { describe, expect, it } from 'vitest';
import { itemDefs } from '../data/items';
import { spellDefs } from '../data/spells';
import { skillDefinitions } from '../data/skillDefinitions';
import { createInitialGameState } from '../game/GameState';
import { renderIcon } from '../render/IconRenderer';
import { Hotbar } from './Hotbar';
import { InventoryPanel } from './InventoryPanel';
import { buildItemTooltip, buildSkillTooltip, buildSpellTooltip, iconTaxonomy, itemIconCategory, skillIconCategory, type IconVisualCategory } from './IconVisualSystem';
import { SkillsPanel } from './SkillsPanel';
import { SpellbookPanel } from './SpellbookPanel';

describe('icon, thumbnail, and tooltip visual system', () => {
  it('defines the shipped icon taxonomy categories', () => {
    const categories: IconVisualCategory[] = [
      'weapon',
      'armor',
      'tool',
      'reagent',
      'potion',
      'food',
      'resource',
      'crafted-component',
      'spell',
      'scroll-book',
      'quest-item',
      'housing-item',
      'container',
      'currency',
      'trap-lock-secret',
      'skill-profession'
    ];
    categories.forEach((category) => expect(iconTaxonomy[category], category).toBeTruthy());
  });

  it('renders icons with category metadata and category-specific class names', () => {
    const html = renderIcon(itemDefs.iron_sword.icon, 'Iron Sword', itemIconCategory(itemDefs.iron_sword));

    expect(html).toContain('data-icon-category="weapon"');
    expect(html).toContain('icon-category-weapon');
  });

  it('builds compact and advanced item tooltip layers', () => {
    const state = createInitialGameState();
    const stack = state.player.inventory.slots[0]!;
    stack.quality = 'exceptional';
    stack.makerName = 'Valen';

    const compact = buildItemTooltip(stack, state, 'compact');
    const advanced = buildItemTooltip(stack, state, 'advanced');

    expect(compact).toContain('Iron Sword');
    expect(compact).toContain('Weapon');
    expect(compact).toContain('Equipped');
    expect(compact).toContain('Damage');
    expect(compact).not.toContain('Crafter');
    expect(advanced).toContain('Crafter: Valen');
    expect(advanced).toContain('Quality: exceptional');
  });

  it('builds spell and skill tooltips around role/group decisions', () => {
    const state = createInitialGameState();
    const spell = spellDefs.magic_arrow;
    const skill = skillDefinitions.find((candidate) => candidate.id === 'Magery')!;

    expect(buildSpellTooltip(spell, state, true, 'compact')).toContain('Circle 1');
    expect(buildSpellTooltip(spell, state, true, 'advanced')).toContain('Reagents');
    expect(skillIconCategory(skill)).toBe('skill-profession');
    expect(buildSkillTooltip(skill, state, 'compact')).toContain('Magic');
  });

  it('applies the system across inventory, hotbar, spellbook, and skills', () => {
    const state = createInitialGameState();
    state.ui.panels.inventory = true;
    state.ui.panels.spellbook = true;
    state.ui.panels.skills = true;

    expect(InventoryPanel(state)).toContain('data-tooltip-advanced');
    expect(InventoryPanel(state)).toContain('data-icon-category="weapon"');
    expect(Hotbar(state)).toContain('data-icon-category="spell"');
    expect(SpellbookPanel(state)).toContain('data-icon-category="spell"');
    expect(SkillsPanel(state)).toContain('data-icon-category="skill-profession"');
  });
});
