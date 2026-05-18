export const stringRegistry = {
  'action.equip': 'Equip',
  'action.use': 'Use',
  'action.cast': 'Cast',
  'action.inspect': 'Inspect',
  'action.gather': 'Gather',
  'action.mine': 'Mine',
  'action.chop': 'Chop',
  'action.pickLock': 'Pick Lock',
  'action.disarm': 'Disarm',
  'ui.spellbook': 'Spellbook',
  'ui.workOrder': 'Work order',
  'ui.plot': 'Plot',
  'ui.reagent': 'Reagent',
  'prompt.selectTree': 'Select a tree.',
  'prompt.selectWater': 'Select water.',
  'prompt.selectMineTarget': 'Select a rock face, cave wall, or ore tile.',
  'prompt.selectSuspiciousGround': 'Select suspicious ground or a map-marked tile.',
  'prompt.selectToolTarget': 'Select a target for {tool}.',
  'prompt.selectSpellTile': 'Select a tile for {spell}.',
  'prompt.selectSpellTarget': 'Select a target for {spell}.',
  'error.unknownSpell': 'Unknown spell. Pick a spell from the spellbook.',
  'error.alreadyCasting': 'You are already casting. Wait for the current cast to finish.',
  'error.spellNotKnown': '{spell} is not in your spellbook. Learn or equip the spell first.',
  'error.mageryTooLow': 'Your Magery is too low for {spell}. Required: {required}.',
  'error.notEnoughMana': '{spell} needs {mana} mana. Drink a mana potion or meditate.',
  'error.missingReagents': 'Missing {count, plural, one {reagent} other {reagents}}: {reagents}. Restock before casting.',
  'error.toolRequired': 'You need {tool} to {verb}. Equip one or keep it in your pack.',
  'error.treeRequired': 'You need a tree to chop this. Select a tree.',
  'error.pickaxeRequired': 'You need a pickaxe to mine here. Equip one or keep it in your pack.',
  'error.targetTooFar': 'That target is too far away. Move closer.',
  'error.chestMayBeTrapped': 'This chest may be trapped. Inspect it first.',
  'error.resourceDepleted': '{resource} is depleted. Try another target.',
  'error.noOreHere': 'This rock does not hold ore. Select a rock face, cave wall, or ore tile.',
  'error.nothingBuriedHere': 'Nothing is buried here. Inspect suspicious ground or follow a map marker.',
  'error.waterRequired': 'You need water to fish here. Select a shoreline or water tile.',
  'status.movingCloser': 'Moving closer to {action}.',
  'status.hotbarUpdated': 'Hotbar {slot} updated.',
  'status.hotbarCleared': 'Hotbar {slot} cleared.',
  'status.equipped': 'Equipped {item}.',
  'journal.currentObjective': 'Current Objective',
  'vendor.workOrderRequirement': '{requester} needs {quantity} {item}. Reward: {gold} gold.'
} as const;

export type StringKey = keyof typeof stringRegistry;

type StringVars = Record<string, string | number | boolean | null | undefined>;

const internalTerms = ['entityId', 'node', 'action state', 'debug teleport'];

export function text(key: StringKey, vars: StringVars = {}): string {
  return interpolateSimple(interpolatePlural(stringRegistry[key], vars), vars);
}

export function plural(count: number, one: string, other = `${one}s`): string {
  return count === 1 ? one : other;
}

export function pseudoLocalize(value: string): string {
  return `[${value.replace(/[aeiou]/gi, (char) => `${char}${char.toLowerCase()}`)}]`;
}

export function terminologyWarningsForRegistry(registry: Record<string, string> = stringRegistry): string[] {
  return Object.entries(registry).flatMap(([key, value]) =>
    internalTerms.filter((term) => value.toLowerCase().includes(term.toLowerCase())).map((term) => `${key} uses internal term "${term}"`)
  );
}

function interpolateSimple(template: string, vars: StringVars): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, name: string) => String(vars[name] ?? ''));
}

function interpolatePlural(template: string, vars: StringVars): string {
  return template.replace(/\{([a-zA-Z0-9_]+), plural, one \{([^{}]+)\} other \{([^{}]+)\}\}/g, (_, name: string, one: string, other: string) => {
    const count = Number(vars[name] ?? 0);
    return count === 1 ? one : other;
  });
}
