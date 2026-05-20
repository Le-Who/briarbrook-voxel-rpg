export const serviceInteriorReferencePlan = {
  bank: {
    referenceId: 'R6',
    location: 'Briarbrook Bank',
    prompt: 'Banker — Open Bank',
    props: ['banker counter', 'shelves', 'chests', 'ledgers', 'rug', 'warm lamps'],
    ui: ['bank storage grid', 'inventory grid', 'gold state', 'capacity state', 'drag-drop slots'],
    interaction: {
      npcId: 'npc_eldon_bank',
      opens: ['bank', 'inventory']
    },
    dynamicLightBudget: 3
  },
  smithy: {
    referenceId: 'R5',
    location: "Brom's Smithy",
    prompt: 'Brom — Craft/Repair',
    primaryRecipeId: 'iron_armor',
    props: ['forge glow', 'anvil', 'tool racks', 'ore bins', 'ingot crates', 'repair bench'],
    ui: ['recipe list', 'selected recipe detail', 'requirements', 'craft button', 'repair actions', 'queue progress'],
    interaction: {
      npcId: 'npc_brom_smithy',
      opens: ['crafting', 'inventory']
    },
    dynamicLightBudget: 3
  }
} as const;
