import { stationLabels } from '../data/recipes';
import { createInitialContentValidationState } from '../game/GameState';
import type { AreaId, ContentValidationState, Entity, QuestObjective, RecipeRequirement } from '../game/types';
import { createContentRegistry, type ContentRegistry } from './ContentRegistry';

interface ValidationContext {
  registry: ContentRegistry;
  errors: string[];
  warnings: string[];
  itemIds: Set<string>;
  skillIds: Set<string>;
  recipeIds: Set<string>;
  spellIds: Set<string>;
  areaIds: Set<string>;
  buildPieceIds: Set<string>;
  resourceIds: Set<string>;
  entityIds: Set<string>;
}

export function validateContent(registry: ContentRegistry = createContentRegistry(), checkedAt = 0): ContentValidationState {
  const context: ValidationContext = {
    registry,
    errors: [],
    warnings: [],
    itemIds: new Set(Object.keys(registry.items)),
    skillIds: new Set(registry.skills.map((skill) => skill.id)),
    recipeIds: new Set(registry.recipes.map((recipe) => recipe.id)),
    spellIds: new Set(Object.keys(registry.spells)),
    areaIds: new Set(Object.keys(registry.areas)),
    buildPieceIds: new Set(registry.buildPieces.map((piece) => piece.id)),
    resourceIds: new Set(Object.keys(registry.resources)),
    entityIds: new Set(Object.keys(registry.entities))
  };

  checkDuplicateIds(context, 'areas', Object.values(registry.areas).map((area) => area.id));
  checkDuplicateIds(context, 'items', Object.values(registry.items).map((item) => item.id));
  checkDuplicateIds(context, 'build pieces', registry.buildPieces.map((piece) => piece.id));
  checkDuplicateIds(context, 'recipes', registry.recipes.map((recipe) => recipe.id));
  checkDuplicateIds(context, 'spells', Object.values(registry.spells).map((spell) => spell.id));
  checkDuplicateIds(context, 'skills', registry.skills.map((skill) => skill.id));
  checkDuplicateIds(context, 'resources', Object.values(registry.resources).map((resource) => resource.id));
  checkDuplicateIds(context, 'resource placements', registry.resourcePlacements.map((placement) => placement.id));
  checkDuplicateIds(context, 'quests', Object.values(registry.quests).map((quest) => quest.id));
  checkDuplicateIds(context, 'entities', Object.values(registry.entities).map((entity) => entity.id));
  checkDuplicateIds(context, 'work orders', registry.economy.workOrders.map((order) => order.id));
  checkDuplicateIds(context, 'market orders', registry.economy.marketOrders.map((order) => order.id));
  checkDuplicateIds(context, 'housing tiers', registry.housing.tiers.map((tier) => String(tier.tier)));
  checkDuplicateIds(context, 'housing pieces', Object.values(registry.housing.pieces).map((piece) => piece.pieceId));
  checkDuplicateIds(context, 'risk zone rules', Object.values(registry.riskZones.rules).map((rule) => rule.id));
  checkDuplicateIds(context, 'treasure maps', Object.values(registry.treasure.maps).map((map) => map.id));
  checkDuplicateIds(context, 'secrets', Object.values(registry.treasure.secrets).map((secret) => secret.id));

  validateItems(context);
  validateBuildPieces(context);
  validateRecipes(context);
  validateSpells(context);
  validateResources(context);
  validateEntities(context);
  validateQuests(context);
  validateEconomy(context);
  validateHousing(context);
  validateRiskZones(context);
  validateTreasure(context);
  validateHotbarDefaults(context);

  return {
    ...createInitialContentValidationState(checkedAt),
    ok: context.errors.length === 0,
    errors: context.errors,
    warnings: context.warnings
  };
}

export function logContentValidation(result: ContentValidationState): void {
  if (result.ok) {
    console.info(`[content] validation passed with ${result.warnings.length} warning(s).`);
    result.warnings.forEach((warning) => console.warn(`[content] ${warning}`));
    return;
  }
  console.groupCollapsed(`[content] validation failed: ${result.errors.length} error(s), ${result.warnings.length} warning(s)`);
  result.errors.forEach((error) => console.error(error));
  result.warnings.forEach((warning) => console.warn(warning));
  console.groupEnd();
}

function checkDuplicateIds(context: ValidationContext, label: string, ids: string[]): void {
  const seen = new Set<string>();
  ids.forEach((id) => {
    if (!id) {
      context.errors.push(`${label}: empty id`);
      return;
    }
    if (seen.has(id)) context.errors.push(`${label}: duplicate id "${id}"`);
    seen.add(id);
  });
}

function validateItems(context: ValidationContext): void {
  Object.entries(context.registry.items).forEach(([key, item]) => {
    if (key !== item.id) context.errors.push(`item "${key}" has mismatched id "${item.id}"`);
    if (item.requiredAmmo) requireItem(context, item.requiredAmmo, `item ${item.id}.requiredAmmo`);
    if (item.buildPieceId && !context.buildPieceIds.has(item.buildPieceId)) {
      context.errors.push(`item ${item.id}.buildPieceId references missing build piece "${item.buildPieceId}"`);
    }
    if (item.skillUsed) requireSkill(context, item.skillUsed, `item ${item.id}.skillUsed`);
    if (item.supportSkill) requireSkill(context, item.supportSkill, `item ${item.id}.supportSkill`);
  });
}

function validateBuildPieces(context: ValidationContext): void {
  context.registry.buildPieces.forEach((piece) => {
    piece.cost.forEach((cost) => requireItemQuantity(context, cost, `build piece ${piece.id}.cost`));
  });
}

function validateTreasure(context: ValidationContext): void {
  Object.values(context.registry.treasure.maps).forEach((map) => {
    requireArea(context, map.regionHint, `treasure map ${map.id}.regionHint`);
    requireItem(context, map.requiredTool, `treasure map ${map.id}.requiredTool`);
    if (!context.registry.treasure.lootTables[map.lootTableId]) context.errors.push(`treasure map ${map.id} references missing loot table "${map.lootTableId}"`);
    map.possibleEncounters.forEach((encounter) => {
      if (!['Undead', 'Bandit', 'Beast', 'Cultist'].includes(encounter)) context.errors.push(`treasure map ${map.id} has invalid encounter "${encounter}"`);
    });
  });
  Object.values(context.registry.treasure.secrets).forEach((secret) => {
    requireArea(context, secret.areaId, `secret ${secret.id}.areaId`);
    requireSkill(context, secret.requiredSkill, `secret ${secret.id}.requiredSkill`);
    if (secret.revealedEntityId && !context.registry.entities[secret.revealedEntityId]) context.errors.push(`secret ${secret.id} references missing revealed entity "${secret.revealedEntityId}"`);
    secret.reward.forEach((reward) => requireItemQuantity(context, reward, `secret ${secret.id}.reward`));
  });
  Object.entries(context.registry.treasure.lootTables).forEach(([id, entries]) => {
    entries.forEach((entry) => requireItemQuantity(context, entry, `treasure loot ${id}`));
  });
  Object.entries(context.registry.treasure.locks).forEach(([id, lock]) => {
    requireItem(context, lock.requiredTool, `lock ${id}.requiredTool`);
  });
}

function validateHotbarDefaults(context: ValidationContext): void {
  const actions = new Set(['attack', 'ranged', 'utility', 'hide', 'defend', 'interact', 'build']);
  if (context.registry.hotbarDefaults.length !== 10) context.errors.push(`hotbar defaults: expected 10 slots, got ${context.registry.hotbarDefaults.length}`);
  context.registry.hotbarDefaults.forEach((binding, index) => {
    if (!binding) {
      context.errors.push(`hotbar defaults slot ${index}: empty binding`);
      return;
    }
    if (binding.kind === 'action' && !actions.has(binding.id)) context.errors.push(`hotbar defaults slot ${index}: unknown action "${binding.id}"`);
    if (binding.kind === 'item') requireItem(context, binding.id, `hotbar defaults slot ${index}`);
    if (binding.kind === 'tool') {
      requireItem(context, binding.id, `hotbar defaults slot ${index}`);
      const item = context.registry.items[binding.id];
      if (item && item.type !== 'tool') context.errors.push(`hotbar defaults slot ${index}: "${binding.id}" is not a tool`);
    }
    if (binding.kind === 'spell' && !context.spellIds.has(binding.id)) context.errors.push(`hotbar defaults slot ${index}: missing spell "${binding.id}"`);
    if (binding.kind === 'skill') requireSkill(context, binding.id, `hotbar defaults slot ${index}`);
  });
}

function validateRecipes(context: ValidationContext): void {
  context.registry.recipes.forEach((recipe) => {
    requireSkill(context, recipe.skill, `recipe ${recipe.id}.skill`);
    if (!stationLabels[recipe.stationType]) context.errors.push(`recipe ${recipe.id} has invalid station "${recipe.stationType}"`);
    recipe.inputs.forEach((input) => requireItemQuantity(context, input, `recipe ${recipe.id}.inputs`));
    recipe.outputs.forEach((output) => requireItemQuantity(context, output, `recipe ${recipe.id}.outputs`));
    requireItem(context, recipe.outputItemId, `recipe ${recipe.id}.outputItemId`);
    if (recipe.toolRequired) requireItem(context, recipe.toolRequired, `recipe ${recipe.id}.toolRequired`);
  });
}

function validateSpells(context: ValidationContext): void {
  Object.entries(context.registry.spells).forEach(([key, spell]) => {
    if (key !== spell.id) context.errors.push(`spell "${key}" has mismatched id "${spell.id}"`);
    requireSkill(context, 'Magery', `spell ${spell.id}.school`);
    spell.reagents.forEach((reagent) => requireItemQuantity(context, reagent, `spell ${spell.id}.reagents`));
    if (spell.manaCost < 0 || spell.castTime < 0 || spell.cooldown < 0) context.errors.push(`spell ${spell.id} has negative timing or cost`);
  });
}

function validateResources(context: ValidationContext): void {
  Object.entries(context.registry.resources).forEach(([key, resource]) => {
    if (key !== resource.id) context.errors.push(`resource "${key}" has mismatched id "${resource.id}"`);
    requireItem(context, resource.toolItemId, `resource ${resource.id}.toolItemId`);
    requireItem(context, resource.yieldItemId, `resource ${resource.id}.yieldItemId`);
    requireSkill(context, resource.skill, `resource ${resource.id}.skill`);
    if (resource.yieldRange[0] <= 0 || resource.yieldRange[1] < resource.yieldRange[0]) context.errors.push(`resource ${resource.id} has invalid yield range`);
  });
  context.registry.resourcePlacements.forEach((placement) => {
    requireArea(context, placement.area, `resource placement ${placement.id}.area`);
    if (!context.resourceIds.has(placement.resourceId)) context.errors.push(`resource placement ${placement.id} references missing resource "${placement.resourceId}"`);
  });
  Object.values(context.registry.resourceTiles).forEach((tile) => {
    requireArea(context, tile.areaId, `resource tile ${tile.name}.areaId`);
    tile.currentYieldTable.forEach((entry) => {
      requireItem(context, entry.itemId, `resource tile ${tile.areaId}:${tile.x},${tile.z}.yield`);
      if (entry.chance <= 0 || entry.chance > 1) context.errors.push(`resource tile ${tile.areaId}:${tile.x},${tile.z} has invalid yield chance ${entry.chance}`);
      if (entry.min <= 0 || entry.max < entry.min) context.errors.push(`resource tile ${tile.areaId}:${tile.x},${tile.z} has invalid yield range for ${entry.itemId}`);
    });
  });
}

function validateEntities(context: ValidationContext): void {
  Object.entries(context.registry.entities).forEach(([key, entity]) => {
    if (key !== entity.id) context.errors.push(`entity "${key}" has mismatched id "${entity.id}"`);
    requireArea(context, entity.area, `entity ${entity.id}.area`);
    if (entity.kind === 'portal') {
      requireArea(context, entity.destination, `portal ${entity.id}.destination`);
    }
    if (entity.kind === 'resource') {
      if (!context.resourceIds.has(entity.resourceId)) context.errors.push(`resource entity ${entity.id} references missing resource "${entity.resourceId}"`);
      requireItem(context, entity.toolItemId, `resource entity ${entity.id}.toolItemId`);
      requireItem(context, entity.yieldItemId, `resource entity ${entity.id}.yieldItemId`);
      requireSkill(context, entity.skill, `resource entity ${entity.id}.skill`);
    }
    if (entity.kind === 'enemy') validateLootTable(context, entity);
    if (entity.kind === 'container') {
      entity.loot.forEach((entry) => requireItemQuantity(context, entry, `container ${entity.id}.loot`));
      if (entity.requiredSpellId && !context.spellIds.has(entity.requiredSpellId)) context.errors.push(`container ${entity.id} references missing spell "${entity.requiredSpellId}"`);
      if (entity.gold < 0) context.errors.push(`container ${entity.id} has invalid gold amount`);
    }
    if (entity.kind === 'npc' || entity.kind === 'social') {
      entity.tradeInventory?.slots.forEach((slot, index) => {
        if (slot) requireItem(context, slot.itemId, `vendor ${entity.id}.slot ${index}`);
      });
      entity.training?.forEach((offer) => requireSkill(context, offer.skillId, `vendor ${entity.id}.training`));
      if (entity.craftStation && !stationLabels[entity.craftStation]) context.errors.push(`vendor ${entity.id} has invalid station "${entity.craftStation}"`);
    }
  });
}

function validateLootTable(context: ValidationContext, entity: Extract<Entity, { kind: 'enemy' }>): void {
  if (entity.goldDrop[0] < 0 || entity.goldDrop[1] < entity.goldDrop[0]) context.errors.push(`enemy ${entity.id} has invalid gold drop`);
  entity.lootTable.forEach((entry, index) => {
    requireItem(context, entry.itemId, `enemy ${entity.id}.lootTable[${index}]`);
    if (entry.min <= 0 || entry.max < entry.min) context.errors.push(`enemy ${entity.id}.lootTable[${index}] has invalid quantity range`);
    if (entry.chance <= 0 || entry.chance > 1) context.errors.push(`enemy ${entity.id}.lootTable[${index}] has invalid chance ${entry.chance}`);
  });
}

function validateQuests(context: ValidationContext): void {
  Object.values(context.registry.quests).forEach((quest) => {
    if (!quest.objectives.length) context.warnings.push(`quest ${quest.id} has no objectives`);
    quest.objectives.forEach((objective) => validateQuestObjective(context, quest.id, objective));
    quest.rewards.items?.forEach((reward) => requireItemQuantity(context, reward, `quest ${quest.id}.rewards.items`));
  });
}

function validateQuestObjective(context: ValidationContext, questId: string, objective: QuestObjective): void {
  if (objective.itemId) requireItem(context, objective.itemId, `quest ${questId}.${objective.type}.itemId`);
  if (objective.skillId) requireSkill(context, objective.skillId, `quest ${questId}.${objective.type}.skillId`);
  if (objective.recipeId && !context.recipeIds.has(objective.recipeId)) context.errors.push(`quest ${questId} references missing recipe "${objective.recipeId}"`);
  if (objective.spellId && !context.spellIds.has(objective.spellId)) context.errors.push(`quest ${questId} references missing spell "${objective.spellId}"`);
  if (objective.containerId && !context.entityIds.has(objective.containerId)) context.errors.push(`quest ${questId} references missing container "${objective.containerId}"`);
  if (objective.areaId) requireArea(context, objective.areaId, `quest ${questId}.${objective.type}.areaId`);
  if (objective.npcName) {
    const found = Object.values(context.registry.entities).some((entity) => (entity.kind === 'npc' || entity.kind === 'social') && entity.name === objective.npcName);
    if (!found) context.errors.push(`quest ${questId} references missing npc "${objective.npcName}"`);
  }
  if (objective.enemyName) {
    const found = Object.values(context.registry.entities).some((entity) => entity.kind === 'enemy' && entity.name === objective.enemyName);
    if (!found) context.errors.push(`quest ${questId} references missing enemy "${objective.enemyName}"`);
  }
}

function validateEconomy(context: ValidationContext): void {
  context.registry.economy.workOrders.forEach((order) => {
    requireItem(context, order.itemId, `work order ${order.id}.itemId`);
    requireSkill(context, order.skill, `work order ${order.id}.skill`);
    if (order.issuerNpcId && !context.entityIds.has(order.issuerNpcId)) context.errors.push(`work order ${order.id} references missing issuer "${order.issuerNpcId}"`);
    order.requiredItems?.forEach((requirement) => requireItemQuantity(context, requirement, `work order ${order.id}.requiredItems`));
    order.rewardItems?.forEach((reward) => requireItemQuantity(context, reward, `work order ${order.id}.rewardItems`));
    order.rewardSkillHints?.forEach((skill) => requireSkill(context, skill, `work order ${order.id}.rewardSkillHints`));
    if (order.quantity <= 0 || order.rewardGold < 0) context.errors.push(`work order ${order.id} has invalid quantity or reward`);
  });
  context.registry.economy.marketOrders.forEach((order) => {
    requireItem(context, order.itemId, `market order ${order.id}.itemId`);
    if (order.issuerId?.startsWith('npc_') && !context.entityIds.has(order.issuerId)) context.errors.push(`market order ${order.id} references missing issuer "${order.issuerId}"`);
    if (order.quantity <= 0 || order.unitPrice <= 0) context.errors.push(`market order ${order.id} has invalid quantity or unit price`);
  });
}

function validateHousing(context: ValidationContext): void {
  context.registry.housing.tiers.forEach((tier) => {
    tier.requirements.items.forEach((item) => requireItemQuantity(context, item, `housing tier ${tier.tier}.requirements`));
    if (tier.requirements.gold < 0 || tier.placementLimit <= 0) context.errors.push(`housing tier ${tier.tier} has invalid gold or placement limit`);
    if (tier.requirements.completedQuestId && !context.registry.quests[tier.requirements.completedQuestId]) {
      context.errors.push(`housing tier ${tier.tier} references missing quest "${tier.requirements.completedQuestId}"`);
    }
  });
  Object.values(context.registry.housing.pieces).forEach((piece) => {
    if (!context.buildPieceIds.has(piece.pieceId)) context.errors.push(`housing piece ${piece.pieceId} references missing build piece`);
    piece.storage?.acceptedItemIds?.forEach((itemId) => requireItem(context, itemId, `housing piece ${piece.pieceId}.storage.acceptedItemIds`));
    piece.stationTypes?.forEach((station) => {
      if (!stationLabels[station]) context.errors.push(`housing piece ${piece.pieceId} has invalid station "${station}"`);
    });
    if (piece.garden) requireItem(context, piece.garden.yieldItemId, `housing piece ${piece.pieceId}.garden.yieldItemId`);
  });
}

function validateRiskZones(context: ValidationContext): void {
  Object.entries(context.registry.riskZones.areaZones).forEach(([areaId, zoneId]) => {
    requireArea(context, areaId, `risk zone ${areaId}`);
    if (!context.registry.riskZones.rules[zoneId]) context.errors.push(`risk zone ${areaId} references missing rule "${zoneId}"`);
  });
  Object.values(context.registry.riskZones.rules).forEach((rule) => {
    if (rule.canAttackPlayers) context.warnings.push(`risk zone ${rule.id} enables player attacks; verify this is deliberate`);
    if (rule.lootRules === 'future_full_loot_disabled' && rule.canAttackPlayers) context.errors.push(`risk zone ${rule.id} cannot enable full-loot style rules in this slice`);
  });
}

function requireItemQuantity(context: ValidationContext, requirement: RecipeRequirement, owner: string): void {
  requireItem(context, requirement.itemId, owner);
  if (requirement.quantity <= 0) context.errors.push(`${owner} has invalid quantity ${requirement.quantity} for "${requirement.itemId}"`);
}

function requireItem(context: ValidationContext, itemId: string, owner: string): void {
  if (!context.itemIds.has(itemId)) context.errors.push(`${owner} references missing item "${itemId}"`);
}

function requireSkill(context: ValidationContext, skillId: string, owner: string): void {
  if (!context.skillIds.has(skillId)) context.errors.push(`${owner} references missing skill "${skillId}"`);
}

function requireArea(context: ValidationContext, areaId: AreaId | string, owner: string): void {
  if (!context.areaIds.has(areaId)) context.errors.push(`${owner} references missing area "${areaId}"`);
}
