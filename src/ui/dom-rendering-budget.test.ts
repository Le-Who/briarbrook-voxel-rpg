import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { ChatPanel } from './ChatPanel';
import { InventoryPanel } from './InventoryPanel';
import { SkillsPanel } from './SkillsPanel';
import { SpellbookPanel } from './SpellbookPanel';

describe('DOM UI rendering budget', () => {
  it('does not attach tooltip payloads to empty inventory cells', () => {
    const state = createInitialGameState();
    state.ui.panels.inventory = true;
    const itemHtml = InventoryPanel(state);
    state.player.inventory.slots = Array.from({ length: state.player.inventory.capacity }, () => null);

    const html = InventoryPanel(state);

    expect(itemHtml).toContain('data-tooltip-version=');
    expect(html).toContain('data-item-drop-target="inventory:0"');
    expect(html).not.toContain('data-tooltip-id="inv:0:empty"');
    expect(html).not.toContain('title="Empty"');
  });

  it('keeps inventory details out of the grid while using the global tooltip contract', () => {
    const state = createInitialGameState();
    state.ui.panels.inventory = true;
    state.ui.selectedInventorySlot = 0;

    const html = InventoryPanel(state);
    const firstSlot = html.match(/<button class="slot[\s\S]*?<\/button>/)?.[0] ?? '';

    expect(html).toContain('data-inventory-layout="resizable-grid"');
    expect(html).toContain('data-inventory-grid-body="true"');
    expect(html).toContain('data-inventory-footer="true"');
    expect(html).toContain('data-item-inspector="true"');
    expect(firstSlot).toContain('data-tooltip=');
    expect(firstSlot).not.toContain('item-inspector');
  });

  it('windows long chat and annotates heavy lists for render-budget telemetry', () => {
    const state = createInitialGameState();
    state.chat = Array.from({ length: 100 }, (_, index) => ({
      id: `chat-${index}`,
      channel: 'Local',
      speaker: 'Scout',
      text: `Line ${index}`,
      createdAt: index
    }));
    state.ui.panels.skills = true;
    state.ui.panels.spellbook = true;

    const chatHtml = ChatPanel(state);
    const skillsHtml = SkillsPanel(state);
    const spellbookHtml = SpellbookPanel(state);

    expect(chatHtml).toContain('data-virtualized-list="chat"');
    expect(chatHtml).toContain('data-window-id="chat"');
    expect(chatHtml).toContain('data-total-rows="100"');
    expect(chatHtml).toContain('data-rendered-rows="80"');
    expect(chatHtml).not.toContain('Line 0');
    expect(chatHtml).toContain('Line 99');
    expect(skillsHtml).toContain('data-virtualized-list="skills"');
    expect(skillsHtml).toContain('data-tooltip-version=');
    expect(spellbookHtml).toContain('data-virtualized-list="spells"');
    expect(spellbookHtml).toContain('data-tooltip-version=');
  });
});
