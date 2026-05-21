export const serviceInteriorReferencePlan = {
  bank: {
    referenceId: 'R6',
    phase14ReferenceIds: ['REF_145_BANK'],
    location: 'Briarbrook Bank',
    prompt: 'Banker — Open Bank',
    compositionZones: ['teller-counter', 'storage-wall', 'ledger-desk', 'customer-floor'],
    props: ['banker counter', 'shelves', 'chests', 'ledgers', 'rug', 'warm lamps'],
    ui: ['bank storage grid', 'inventory grid', 'gold state', 'capacity state', 'drag-drop slots', 'right-sized scrollable grids'],
    interaction: {
      npcId: 'npc_eldon_bank',
      opens: ['bank', 'inventory']
    },
    dynamicLightBudget: 3
  },
  smithy: {
    referenceId: 'R5',
    phase14ReferenceIds: ['REF_145_SMITHY'],
    location: "Brom's Smithy",
    prompt: 'Brom — Craft/Repair',
    primaryRecipeId: 'iron_armor',
    compositionZones: ['forge-hearth', 'brom-workspace', 'tool-wall', 'material-staging'],
    props: ['forge glow', 'anvil', 'tool racks', 'ore bins', 'ingot crates', 'repair bench'],
    ui: ['recipe list', 'selected recipe detail', 'requirements', 'craft button', 'repair actions', 'queue progress', 'scrollable recipe detail'],
    interaction: {
      npcId: 'npc_brom_smithy',
      opens: ['crafting', 'inventory']
    },
    dynamicLightBudget: 3
  }
} as const;
