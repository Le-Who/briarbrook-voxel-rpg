import { createContentRegistry, type ContentRegistry } from './ContentRegistry';
import { validateContent } from './ContentValidation';
import { createDevScenePresets } from './devScenes';

export const CONTENT_VALIDATE_COMMAND = 'node tools/content-validate.mjs';

export interface ResolvedQuantityPreview {
  itemId: string;
  itemName: string;
  quantity: number;
  missing: boolean;
}

export interface ItemAuthoringPreview {
  id: string;
  name: string;
  type: string;
  stackable: boolean;
  maxStack: number;
  weight: number;
  value: number;
  iconShape: string;
  visualPrefabId: string | null;
  visualFallback: 'visual_prefab' | 'procedural_fallback';
}

export interface SpellAuthoringPreview {
  id: string;
  displayName: string;
  circle: number;
  manaCost: number;
  targetType: string;
  effectType: string;
  reagents: ResolvedQuantityPreview[];
  iconShape: string;
}

export interface RecipeAuthoringPreview {
  id: string;
  name: string;
  stationType: string;
  skill: string;
  level: number;
  inputs: ResolvedQuantityPreview[];
  outputs: ResolvedQuantityPreview[];
  requirements: ResolvedQuantityPreview[];
}

export interface ContentAuthoringReport {
  checkedAt: number;
  validation: ReturnType<typeof validateContent>;
  counts: Record<string, number>;
  previewSamples: {
    items: ItemAuthoringPreview[];
    spells: SpellAuthoringPreview[];
    recipes: RecipeAuthoringPreview[];
  };
  spawnTestAreas: string[];
  deadReferences: string[];
  localizationKeys: string[];
}

export function previewItem(registry: ContentRegistry, itemId: string): ItemAuthoringPreview | null {
  const item = registry.items[itemId];
  if (!item) return null;
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    stackable: item.stackable,
    maxStack: item.maxStack,
    weight: item.weight,
    value: item.value,
    iconShape: item.icon.shape,
    visualPrefabId: item.visualPrefabId ?? null,
    visualFallback: item.visualPrefabId ? 'visual_prefab' : 'procedural_fallback'
  };
}

export function previewSpell(registry: ContentRegistry, spellId: string): SpellAuthoringPreview | null {
  const spell = registry.spells[spellId];
  if (!spell) return null;
  return {
    id: spell.id,
    displayName: spell.displayName,
    circle: spell.circle,
    manaCost: spell.manaCost,
    targetType: spell.targetType,
    effectType: spell.effectType,
    reagents: spell.reagents.map((requirement) => resolveQuantity(registry, requirement)),
    iconShape: spell.iconDescriptor.shape
  };
}

export function previewRecipe(registry: ContentRegistry, recipeId: string): RecipeAuthoringPreview | null {
  const recipe = registry.recipes.find((entry) => entry.id === recipeId);
  if (!recipe) return null;
  return {
    id: recipe.id,
    name: recipe.name,
    stationType: recipe.stationType,
    skill: recipe.skill,
    level: recipe.level,
    inputs: recipe.inputs.map((requirement) => resolveQuantity(registry, requirement)),
    outputs: recipe.outputs.map((output) => resolveQuantity(registry, output)),
    requirements: recipe.requirements.map((requirement) => resolveQuantity(registry, requirement))
  };
}

export function detectDeadReferences(registry: ContentRegistry = createContentRegistry()): string[] {
  return validateContent(registry).errors.filter((error) => error.includes('references missing') || error.includes('missing item') || error.includes('missing recipe') || error.includes('missing spell') || error.includes('missing skill'));
}

export function createContentAuthoringReport(registry: ContentRegistry = createContentRegistry(), checkedAt = 0): ContentAuthoringReport {
  const validation = validateContent(registry, checkedAt);
  const previewSamples = {
    items: ['iron_sword', 'pickaxe', 'rough_treasure_map'].map((id) => previewItem(registry, id)).filter((entry): entry is ItemAuthoringPreview => Boolean(entry)),
    spells: ['magic_arrow', 'heal', 'detect_magic'].map((id) => previewSpell(registry, id)).filter((entry): entry is SpellAuthoringPreview => Boolean(entry)),
    recipes: ['iron_sword', 'brew_heal_potion', 'storage_chest'].map((id) => previewRecipe(registry, id)).filter((entry): entry is RecipeAuthoringPreview => Boolean(entry))
  };

  return {
    checkedAt,
    validation,
    counts: {
      areas: Object.keys(registry.areas).length,
      items: Object.keys(registry.items).length,
      spells: Object.keys(registry.spells).length,
      skills: registry.skills.length,
      professions: registry.professions.clusters.length,
      professionMilestones: registry.professions.milestones.length,
      recipes: registry.recipes.length,
      workOrders: registry.economy.workOrders.length,
      resources: Object.keys(registry.resources).length,
      enemies: Object.values(registry.entities).filter((entity) => entity.kind === 'enemy').length,
      lootTables: Object.values(registry.entities).filter((entity) => entity.kind === 'enemy' || entity.kind === 'container').length,
      housingObjects: Object.keys(registry.housing.pieces).length,
      mapMarkers: registry.mapMarkers.length,
      events: registry.events.length,
      quests: Object.keys(registry.quests).length,
      visualPrefabs: registry.visualPrefabs.length
    },
    previewSamples,
    spawnTestAreas: createDevScenePresets().map((scene) => scene.id),
    deadReferences: detectDeadReferences(registry),
    localizationKeys: createLocalizationKeys(registry)
  };
}

export function exportContentAuthoringReport(report: ContentAuthoringReport = createContentAuthoringReport()): string {
  return JSON.stringify(report, null, 2);
}

export function formatContentAuthoringReport(report: ContentAuthoringReport = createContentAuthoringReport()): string {
  const lines = [
    `Content validation: ${report.validation.ok ? 'PASS' : 'FAIL'}`,
    `Checked at: ${report.checkedAt}`,
    `Errors: ${report.validation.errors.length}`,
    `Warnings: ${report.validation.warnings.length}`,
    `Dead references: ${report.deadReferences.length}`,
    '',
    'Counts:',
    ...Object.entries(report.counts).map(([key, value]) => `- ${key}: ${value}`),
    '',
    `Preview items: ${report.previewSamples.items.map((item) => item.id).join(', ')}`,
    `Preview spells: ${report.previewSamples.spells.map((spell) => spell.id).join(', ')}`,
    `Preview recipes: ${report.previewSamples.recipes.map((recipe) => recipe.id).join(', ')}`,
    `Spawn test areas: ${report.spawnTestAreas.join(', ')}`
  ];

  if (report.validation.errors.length) {
    lines.push('', 'Critical errors:', ...report.validation.errors.map((error) => `- ${error}`));
  }
  if (report.validation.warnings.length) {
    lines.push('', 'Warnings:', ...report.validation.warnings.map((warning) => `- ${warning}`));
  }

  return lines.join('\n');
}

function resolveQuantity(registry: ContentRegistry, requirement: { itemId: string; quantity: number }): ResolvedQuantityPreview {
  const item = registry.items[requirement.itemId];
  return {
    itemId: requirement.itemId,
    itemName: item?.name ?? '<missing item>',
    quantity: requirement.quantity,
    missing: !item
  };
}

function createLocalizationKeys(registry: ContentRegistry): string[] {
  const keys = [
    ...Object.keys(registry.items).map((id) => `content.item.${id}.name`),
    ...Object.keys(registry.spells).map((id) => `content.spell.${id}.name`),
    ...registry.recipes.map((recipe) => `content.recipe.${recipe.id}.name`),
    ...registry.skills.map((skill) => `content.skill.${skill.id}.name`),
    ...registry.professions.clusters.map((profession) => `content.profession.${profession.id}.title`),
    ...registry.professions.milestones.map((milestone) => `content.mastery.${milestone.id}.title`),
    ...registry.professions.contracts.map((contract) => `content.professionContract.${contract.id}.title`),
    ...Object.keys(registry.quests).map((id) => `content.quest.${id}.title`),
    ...registry.events.map((event) => `content.event.${event.type}.title`),
    ...registry.mapMarkers.map((marker) => `content.mapMarker.${marker.id}.label`)
  ];
  return Array.from(new Set(keys)).sort();
}
