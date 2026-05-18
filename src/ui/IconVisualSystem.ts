import type { SpellDefinition } from '../data/spells';
import type { SkillDefinition } from '../data/skillDefinitions';
import { itemDefs } from '../data/items';
import type { GameState, ItemDef, ItemStack } from '../game/types';

export type IconVisualCategory =
  | 'weapon'
  | 'armor'
  | 'tool'
  | 'reagent'
  | 'potion'
  | 'food'
  | 'resource'
  | 'crafted-component'
  | 'spell'
  | 'scroll-book'
  | 'quest-item'
  | 'housing-item'
  | 'container'
  | 'currency'
  | 'trap-lock-secret'
  | 'skill-profession';

export type TooltipMode = 'compact' | 'advanced' | 'compare' | 'pinned';

export interface IconTaxonomyEntry {
  silhouette: string;
  colorFamily: string;
  backgroundShape: 'circle' | 'diamond' | 'square' | 'shield' | 'none';
  badgePolicy: string;
}

export const iconTaxonomy: Record<IconVisualCategory, IconTaxonomyEntry> = {
  weapon: { silhouette: 'long diagonal read with metal edge', colorFamily: 'steel and warm grip', backgroundShape: 'diamond', badgePolicy: 'durability, equipped, hotbar' },
  armor: { silhouette: 'body protection or shield mass', colorFamily: 'leather, iron, cloth', backgroundShape: 'shield', badgePolicy: 'equipped, durability, quality' },
  tool: { silhouette: 'handle plus working head', colorFamily: 'wood with metal head', backgroundShape: 'square', badgePolicy: 'hotbar, active, durability' },
  reagent: { silhouette: 'small material cluster', colorFamily: 'arcane natural accents', backgroundShape: 'circle', badgePolicy: 'quantity, missing' },
  potion: { silhouette: 'bottle with visible fill', colorFamily: 'effect color plus glass highlight', backgroundShape: 'circle', badgePolicy: 'quantity, usable, cooldown' },
  food: { silhouette: 'rounded edible shape', colorFamily: 'harvest colors', backgroundShape: 'circle', badgePolicy: 'quantity, usable' },
  resource: { silhouette: 'raw material chunk', colorFamily: 'earth and material color', backgroundShape: 'square', badgePolicy: 'quantity, newly acquired' },
  'crafted-component': { silhouette: 'worked material or part', colorFamily: 'workshop neutrals', backgroundShape: 'square', badgePolicy: 'quantity, quality, material' },
  spell: { silhouette: 'simple symbolic effect', colorFamily: 'school and role color', backgroundShape: 'circle', badgePolicy: 'known, mana, missing reagent' },
  'scroll-book': { silhouette: 'page, scroll, or bound book', colorFamily: 'paper and ink', backgroundShape: 'square', badgePolicy: 'known, quest locked, quantity' },
  'quest-item': { silhouette: 'unique object with gold accent', colorFamily: 'quest gold and object color', backgroundShape: 'diamond', badgePolicy: 'quest locked, newly acquired' },
  'housing-item': { silhouette: 'placeable prop silhouette', colorFamily: 'construction material', backgroundShape: 'square', badgePolicy: 'quantity, placeable, missing requirement' },
  container: { silhouette: 'bag, pack, chest, or pouch', colorFamily: 'leather and wood', backgroundShape: 'square', badgePolicy: 'capacity, equipped, access' },
  currency: { silhouette: 'coin or token', colorFamily: 'gold and silver', backgroundShape: 'circle', badgePolicy: 'quantity only' },
  'trap-lock-secret': { silhouette: 'mechanism, key, or hidden mark', colorFamily: 'dark metal and warning accent', backgroundShape: 'diamond', badgePolicy: 'locked, armed, detected' },
  'skill-profession': { silhouette: 'profession-symbol glyph', colorFamily: 'group color', backgroundShape: 'circle', badgePolicy: 'recent, trainable, pinned' }
};

const reagentItemIds = new Set(['black_pearl', 'blood_moss', 'garlic', 'ginseng', 'mandrake_root', 'nightshade', 'spider_silk', 'sulfurous_ash']);

export function itemIconCategory(def: ItemDef): IconVisualCategory {
  if (def.type === 'weapon') return 'weapon';
  if (def.type === 'armor') return 'armor';
  if (def.type === 'tool') return def.id === 'lockpick' ? 'trap-lock-secret' : 'tool';
  if (def.type === 'container') return 'container';
  if (def.type === 'building') return 'housing-item';
  if (def.useEffect === 'food') return 'food';
  if (def.icon.shape === 'potion') return 'potion';
  if (reagentItemIds.has(def.id)) return 'reagent';
  if (def.icon.shape === 'scroll') return 'scroll-book';
  if (def.id.includes('coin') || def.id === 'gold') return 'currency';
  if (def.id.includes('trap') || def.id.includes('lock') || def.id.includes('secret')) return 'trap-lock-secret';
  if (def.type === 'resource') return def.id.includes('gear') || def.id.includes('cloth') ? 'crafted-component' : 'resource';
  return 'resource';
}

export function spellIconCategory(_spell: SpellDefinition): IconVisualCategory {
  return 'spell';
}

export function skillIconCategory(_definition: SkillDefinition): IconVisualCategory {
  return 'skill-profession';
}

export function limitedBadgeLabels(labels: string[], max = 3): string[] {
  const clean = labels.filter(Boolean);
  if (clean.length <= max) return clean;
  return [...clean.slice(0, max - 1), `+${clean.length - (max - 1)}`];
}

export function buildItemTooltip(stack: ItemStack | null, state: GameState | undefined, mode: TooltipMode = 'compact'): string {
  if (!stack) return 'Empty slot\nNo item here.';
  return buildItemTooltipFromDef(stack, itemDefs[stack.itemId], state, mode);
}

export function buildItemTooltipFromDef(stack: ItemStack | null, def: ItemDef | undefined, state: GameState | undefined, mode: TooltipMode = 'compact'): string {
  if (!stack || !def) return 'Unknown item\nMissing item definition.';
  const category = itemIconCategory(def);
  const states = itemStateLabels(stack, state);
  const lines = [
    def.name,
    `${titleCase(category)}${states.length ? ` · ${limitedBadgeLabels(states).join(' · ')}` : ''}`
  ];

  const stats = coreItemStats(stack, def);
  if (stats) lines.push(stats);
  if (stack.maxDurability) lines.push(`Durability ${stack.durability ?? stack.maxDurability}/${stack.maxDurability}`);
  lines.push(`Weight ${(def.weight * stack.quantity).toFixed(1)} · Value ${def.value}g`);

  if (mode === 'compact') return lines.slice(0, 5).join('\n');

  const advanced = [
    ...lines,
    `Visual ${def.visualPrefabId ?? 'generic procedural'} · ${iconTaxonomy[category].silhouette}`,
    stack.materialType ? `Material: ${stack.materialType}` : '',
    stack.quality ? `Quality: ${stack.quality}` : '',
    stack.makerName ? `Crafter: ${stack.makerName}` : '',
    stack.trait ? `Trait: ${stack.trait}` : '',
    stack.poisonCharges ? `Poison: ${stack.poisonCharges} charges` : '',
    mode === 'compare' && def.equipmentSlot ? `Compare slot: ${def.equipmentSlot}` : '',
    mode === 'pinned' ? 'Pinned inspector: stable detail view' : ''
  ].filter(Boolean);
  return advanced.join('\n');
}

export function buildSpellTooltip(spell: SpellDefinition, state: GameState, isKnown: boolean, mode: TooltipMode = 'compact'): string {
  const missingReagents = spell.reagents.filter((reagent) => countItem(state, reagent.itemId) < reagent.quantity).map((reagent) => reagent.itemId);
  const lines = [
    isKnown ? spell.displayName : 'Unknown Spell',
    `Spell · Circle ${spell.circle} · ${spell.category}`,
    `${spell.manaCost} mana · ${spell.targetType} target · ${spell.range} range`,
    isKnown ? spell.description : 'Not learned yet'
  ];
  if (missingReagents.length) lines.push(`Missing ${missingReagents.join(', ')}`);
  if (mode === 'compact') return lines.join('\n');
  return [
    ...lines,
    `Reagents: ${spell.reagents.map((reagent) => `${reagent.itemId} x${reagent.quantity}`).join(', ') || 'none'}`,
    `Cast ${spell.castTime}s · Cooldown ${spell.cooldown}s`,
    `Difficulty ${spell.difficulty} · Min skill ${spell.minSkill}`,
    `Words: ${spell.wordsOfPower ?? 'unknown'}`
  ].join('\n');
}

export function buildSkillTooltip(definition: SkillDefinition, state: GameState, mode: TooltipMode = 'compact'): string {
  const skill = state.player.skills[definition.id];
  const lines = [
    definition.displayName,
    `Skill · ${definition.group} · ${definition.roles.join(', ')}`,
    definition.description,
    `Value ${skill?.value.toFixed(1) ?? '0.0'} / ${skill?.cap ?? definition.cap}`
  ];
  if (mode === 'compact') return lines.join('\n');
  return [
    ...lines,
    `Trained by: ${definition.verbs.join(', ') || 'future interaction'}`,
    `Stats: ${definition.primaryStat} / ${definition.secondaryStat}`,
    `Gain mode: ${skill?.mode ?? definition.gainMode}`
  ].join('\n');
}

export function itemStateLabels(stack: ItemStack, state: GameState | undefined): string[] {
  const labels: string[] = [];
  const equipmentSlot = state ? Object.entries(state.player.equipment).find(([, equipped]) => equipped?.itemId === stack.itemId)?.[0] : null;
  const hotbarIndex = state ? state.ui.hotbar.findIndex((binding) => (binding?.kind === 'item' || binding?.kind === 'tool') && binding.id === stack.itemId) : -1;
  if (equipmentSlot) labels.push('Equipped');
  if (hotbarIndex >= 0) labels.push('Assigned');
  if (state?.ui.activeHotbarSlot === hotbarIndex) labels.push('Active');
  if (stack.maxDurability) {
    const ratio = (stack.durability ?? stack.maxDurability) / stack.maxDurability;
    if (ratio <= 0) labels.push('Broken');
    else if (ratio <= 0.25) labels.push('Damaged');
    else if (ratio <= 0.55) labels.push('Worn');
  }
  if (stack.quality === 'exceptional' || stack.exceptional) labels.push('Exceptional');
  return labels;
}

function coreItemStats(stack: ItemStack, def: ItemDef): string {
  if (def.weaponClass) return `Damage ${def.baseDamageMin ?? 0}-${def.baseDamageMax ?? 0} · Speed ${def.swingSpeed ?? 1}s`;
  const armor = Number(stack.statModifiers?.armor ?? def.statModifiers?.armor ?? 0);
  if (armor) return `Armor ${armor}`;
  if (def.useEffect && def.power) return `${titleCase(def.useEffect)} ${def.power}`;
  if (def.buildPieceId) return `Places ${def.buildPieceId}`;
  return `Qty ${stack.quantity}`;
}

function countItem(state: GameState, itemId: string): number {
  return state.player.inventory.slots.reduce((total, stack) => total + (stack?.itemId === itemId ? stack.quantity : 0), 0);
}

function titleCase(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
