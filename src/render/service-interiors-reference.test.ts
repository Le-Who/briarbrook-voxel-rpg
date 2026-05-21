import { describe, expect, it } from 'vitest';
import { createInitialGameState, createStack } from '../game/GameState';
import { describeInteraction } from '../systems/InteractionAffordanceSystem';
import { AreaManager } from '../world/AreaManager';
import { BankPanel } from '../ui/BankPanel';
import { CraftingPanel } from '../ui/CraftingPanel';
import { applyScreenshotParityPreset } from '../tools/screenshotParity';
import { startCraft } from '../systems/CraftingSystem';
import { addItem } from '../systems/InventorySystem';
import { serviceInteriorReferencePlan } from './ServiceInteriorReferencePlan';

describe('R5-R6 service interior reference contract', () => {
  it('defines grounded bank and smithy service targets', () => {
    expect(serviceInteriorReferencePlan.bank.referenceId).toBe('R6');
    expect(serviceInteriorReferencePlan.bank.phase14ReferenceIds).toEqual(['REF_145_BANK']);
    expect(serviceInteriorReferencePlan.bank.compositionZones).toEqual(expect.arrayContaining(['teller-counter', 'storage-wall', 'ledger-desk', 'customer-floor']));
    expect(serviceInteriorReferencePlan.bank.props).toEqual(expect.arrayContaining(['banker counter', 'shelves', 'chests', 'ledgers', 'rug', 'warm lamps']));
    expect(serviceInteriorReferencePlan.bank.ui).toEqual(expect.arrayContaining(['bank storage grid', 'inventory grid', 'gold state', 'capacity state', 'drag-drop slots', 'right-sized scrollable grids']));
    expect(serviceInteriorReferencePlan.bank.prompt).toBe('Banker — Open Bank');

    expect(serviceInteriorReferencePlan.smithy.referenceId).toBe('R5');
    expect(serviceInteriorReferencePlan.smithy.phase14ReferenceIds).toEqual(['REF_145_SMITHY']);
    expect(serviceInteriorReferencePlan.smithy.compositionZones).toEqual(expect.arrayContaining(['forge-hearth', 'brom-workspace', 'tool-wall', 'material-staging']));
    expect(serviceInteriorReferencePlan.smithy.props).toEqual(expect.arrayContaining(['forge glow', 'anvil', 'tool racks', 'ore bins', 'ingot crates', 'repair bench']));
    expect(serviceInteriorReferencePlan.smithy.ui).toEqual(expect.arrayContaining(['recipe list', 'selected recipe detail', 'requirements', 'craft button', 'repair actions', 'queue progress', 'scrollable recipe detail']));
    expect(serviceInteriorReferencePlan.smithy.prompt).toBe('Brom — Craft/Repair');
    expect(serviceInteriorReferencePlan.smithy.primaryRecipeId).toBe('iron_armor');
  });

  it('sets R5 and R6 screenshot parity to actual service UI states', () => {
    const areaManager = new AreaManager();

    const smithy = createInitialGameState();
    expect(applyScreenshotParityPreset(smithy, areaManager, 'r5-smithy-crafting')).toBe(true);
    expect(smithy.player.currentArea).toBe('blacksmith');
    expect(smithy.ui.panels.crafting).toBe(true);
    expect(smithy.ui.panels.inventory).toBe(true);
    expect(smithy.ui.selectedStationType).toBe('forge');
    expect(smithy.ui.selectedRecipeId).toBe('iron_armor');
    const craftingHtml = CraftingPanel(smithy);
    expect(craftingHtml).toContain('Blacksmithing');
    expect(craftingHtml).toContain('Iron Armor');
    expect(craftingHtml).toContain('Requirements');
    expect(craftingHtml).toContain('data-action="craft-selected"');
    expect(craftingHtml).toContain('data-repair-slot');

    const bank = createInitialGameState();
    bank.player.bank.slots[0] = createStack('iron_sword');
    bank.player.bank.slots[1] = createStack('iron_bar', 7);
    bank.player.bankGold = 42;
    expect(applyScreenshotParityPreset(bank, areaManager, 'r6-bank-storage')).toBe(true);
    expect(bank.player.currentArea).toBe('bank');
    expect(bank.ui.panels.bank).toBe(true);
    expect(bank.ui.panels.inventory).toBe(true);
    const bankHtml = BankPanel(bank);
    expect(bankHtml).toContain('Bank Storage');
    expect(bankHtml).toContain('Storage');
    expect(bankHtml).toContain('42');
    expect(bankHtml).toContain('data-item-drop-target="bank:0"');
    expect(bankHtml).toContain('data-tooltip-source="bank"');
  });

  it('uses clean service prompts for banker and blacksmith interactions', () => {
    const state = createInitialGameState();
    state.player.currentArea = 'bank';
    expect(describeInteraction(state, { kind: 'entity', entityId: 'npc_eldon_bank' })?.prompt).toBe('Banker — Open Bank');

    state.player.currentArea = 'blacksmith';
    expect(describeInteraction(state, { kind: 'entity', entityId: 'npc_brom_smithy' })?.prompt).toBe('Brom — Craft/Repair');
  });

  it('allows Broms public forge to start a real blacksmithing craft', () => {
    const state = createInitialGameState();
    const areaManager = new AreaManager();
    expect(applyScreenshotParityPreset(state, areaManager, 'r5-smithy-crafting')).toBe(true);
    state.craftQueue = [];
    addItem(state.player.inventory, 'iron_bar', 16);
    addItem(state.player.inventory, 'leather', 6);

    startCraft(state, 'iron_armor', 1);

    expect(state.craftQueue).toHaveLength(1);
    expect(state.craftQueue[0]?.recipeId).toBe('iron_armor');
    expect(state.ui.prompt).not.toContain('Place a home');
  });
});
