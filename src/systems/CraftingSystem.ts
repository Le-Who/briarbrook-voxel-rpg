import { itemDefs } from '../data/items';
import { recipes } from '../data/recipes';
import { createId, createStack } from '../game/GameState';
import type { GameState, InventoryState, Recipe, RecipeOutput } from '../game/types';
import { addSystemMessage } from './ChatSystem';
import { addItem, hasItems, removeItems } from './InventorySystem';
import { addFloatingText } from './LootSystem';
import { recordQuestEvent, refreshQuestProgress } from './QuestSystem';
import { attemptSkillUse, getSkillValue } from './SkillSystem';
import { createExceptionalTrait } from './EconomySystem';
import { hasHomeCraftStation } from './HousingSystem';
import { recordItemConsumed, recordResourceOutflow } from './TelemetrySystem';

export function startCraft(state: GameState, recipeId: string, quantity: number): void {
  const recipe = recipes.find((candidate) => candidate.id === recipeId);
  if (!recipe) return;
  if (!hasHomeCraftStation(state, recipe.stationType)) {
    const stationName = recipe.stationType === 'forge' ? 'small forge' : `${recipe.stationType} station`;
    state.ui.prompt = `Place a home ${stationName} before crafting ${recipe.name} on your plot.`;
    addSystemMessage(state, state.ui.prompt);
    return;
  }
  const skillValue = getSkillValue(state, recipe.skill);
  if (skillValue < recipe.minSkill) {
    state.ui.prompt = `${recipe.name} requires ${recipe.skill} ${recipe.minSkill}.`;
    addSystemMessage(state, `${recipe.name} requires ${recipe.skill} ${recipe.minSkill}.`);
    return;
  }
  if (recipe.toolRequired && !hasItems(state.player.inventory, [{ itemId: recipe.toolRequired, quantity: 1 }])) {
    const toolName = itemDefs[recipe.toolRequired]?.name ?? recipe.toolRequired;
    state.ui.prompt = `Requires ${toolName}.`;
    addSystemMessage(state, `Requires ${toolName}.`);
    return;
  }
  const costs = recipe.inputs.map((req) => ({ ...req, quantity: req.quantity * quantity }));
  if (!hasItems(state.player.inventory, costs)) {
    state.ui.prompt = 'Missing crafting materials.';
    addSystemMessage(state, 'Missing crafting materials.');
    return;
  }
  costs.forEach((cost) => {
    removeItems(state.player.inventory, cost.itemId, cost.quantity);
    recordItemConsumed(state, cost.itemId, cost.quantity);
    recordResourceOutflow(state, cost.itemId, cost.quantity);
  });
  state.craftQueue.push({
    id: createId('craft'),
    recipeId,
    quantity,
    remaining: recipe.duration * quantity,
    total: recipe.duration * quantity
  });
  addSystemMessage(state, `Crafting started: ${recipe.name}.`);
}

export function updateCrafting(state: GameState, dt: number): void {
  const job = state.craftQueue[0];
  if (!job) return;
  job.remaining -= dt;
  if (job.remaining > 0) return;
  const recipe = recipes.find((candidate) => candidate.id === job.recipeId);
  if (!recipe) {
    state.craftQueue.shift();
    return;
  }
  const skillValue = getSkillValue(state, recipe.skill);
  const successChance = Math.max(0.25, Math.min(0.98, 0.62 + (skillValue - recipe.difficulty) * 0.014));
  const success = Math.random() < successChance;
  attemptSkillUse(state, recipe.skill, {
    verb: 'craft',
    difficulty: recipe.difficulty,
    success,
    itemId: recipe.outputItemId,
    relatedSkills: supportSkills(recipe)
  });

  if (!success) {
    handleCraftFailure(state, recipe, job.quantity);
    state.craftQueue.shift();
    return;
  }

  const quality = rollQuality(state, recipe, skillValue);
  const added = recipe.outputs.every((output) => addCraftedOutput(state.player.inventory, output, job.quantity, quality, state.player.name));
  if (!added) {
    addSystemMessage(state, 'Craft complete, but your pack is too full for every output.');
  }
  addFloatingText(state, `${quality === 'exceptional' ? 'Exceptional ' : ''}${recipe.name}`, state.player.position, '#f0c957');
  addSystemMessage(state, `${quality === 'exceptional' ? 'Exceptional ' : ''}Crafted ${recipe.name} x${job.quantity}.`);
  recordQuestEvent(state, { type: 'craft', recipeId: recipe.id, skillId: recipe.skill, itemId: recipe.outputItemId });
  if (itemDefs[recipe.outputItemId]) {
    refreshQuestProgress(state);
  }
  state.craftQueue.shift();
}

function addCraftedOutput(inventory: InventoryState, output: RecipeOutput, batches: number, quality: NonNullable<ReturnType<typeof rollQuality>>, makerName: string): boolean {
  const def = itemDefs[output.itemId];
  if (!def) return false;
  const quantity = output.quantity * batches;
  if (def.stackable) return addItem(inventory, output.itemId, quantity);
  for (let i = 0; i < quantity; i += 1) {
    const empty = inventory.slots.findIndex((slot) => !slot);
    if (empty === -1) return false;
    const stack = createStack(output.itemId, 1);
    stack.quality = quality;
    stack.makerName = makerName;
    stack.materialType = output.materialType;
    applyMaterialModifiers(stack);
    if (quality === 'exceptional' && stack.durability && stack.maxDurability) {
      stack.durability = Math.round(stack.durability * 1.12);
      stack.maxDurability = stack.durability;
    }
    createExceptionalTrait(stack);
    inventory.slots[empty] = stack;
  }
  return true;
}

function applyMaterialModifiers(stack: ReturnType<typeof createStack>): void {
  const material = stack.materialType ?? '';
  if (material.includes('copper')) {
    stack.trait = stack.trait ?? 'conductive';
    stack.statModifiers = { ...(stack.statModifiers ?? {}), magicResist: 1 };
  } else if (material.includes('oak')) {
    stack.trait = stack.trait ?? 'supple';
    stack.statModifiers = { ...(stack.statModifiers ?? {}), dodgeChance: 1 };
  } else if (material.includes('iron')) {
    stack.statModifiers = { ...(stack.statModifiers ?? {}), armor: material.includes('fine') ? 1 : 0 };
  }
}

function rollQuality(state: GameState, recipe: Recipe, skillValue: number): 'crude' | 'normal' | 'exceptional' {
  const exceptionalChance = Math.max(0, Math.min(0.45, recipe.exceptionalChance + Math.max(0, skillValue - recipe.difficulty) * 0.004 + state.player.attributes.Luck * 0.002));
  if (Math.random() < exceptionalChance) return 'exceptional';
  if (skillValue < recipe.difficulty - 12) return 'crude';
  return 'normal';
}

function handleCraftFailure(state: GameState, recipe: Recipe, quantity: number): void {
  if (recipe.failureMode === 'partial-refund') {
    const refund = recipe.inputs[0];
    if (refund) addItem(state.player.inventory, refund.itemId, Math.max(1, Math.floor((refund.quantity * quantity) / 2)));
  }
  addFloatingText(state, 'Craft failed', state.player.position, '#f0765f');
  addSystemMessage(state, `${recipe.name} failed at the ${recipe.stationType} station.`);
}

function supportSkills(recipe: Recipe): string[] | undefined {
  if (recipe.skill === 'Blacksmithing' || recipe.skill === 'Mining') return ['Arms Lore', 'Item Identification'];
  if (recipe.skill === 'Carpentry' || recipe.skill === 'Bowcraft/Fletching') return ['Lumberjacking', 'Item Identification'];
  if (recipe.skill === 'Tailoring') return ['Item Identification'];
  if (recipe.skill === 'Alchemy' || recipe.skill === 'Inscription') return ['Evaluating Intelligence', 'Meditation'];
  if (recipe.skill === 'Cooking') return ['Taste Identification'];
  if (recipe.skill === 'Tinkering') return ['Lockpicking', 'Remove Trap'];
  return undefined;
}
