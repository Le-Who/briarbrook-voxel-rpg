import { stationLabels } from '../data/recipes';
import { createInitialContentValidationState } from '../game/GameState';
import type { AreaId, ContentValidationState, EconomyOrderCategory, Entity, QuestObjective, RecipeRequirement, Vec3 } from '../game/types';
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
  visualPrefabIds: Set<string>;
  professionIds: Set<string>;
  masteryIds: Set<string>;
  economyCategories: Set<string>;
}

const economyCategories: EconomyOrderCategory[] = [
  'smithy',
  'healer',
  'mage',
  'guard',
  'carpenter',
  'tavern',
  'banker',
  'metal',
  'wood',
  'healing',
  'reagents',
  'food',
  'combat',
  'banking',
  'building',
  'treasure',
  'housing',
  'misc'
];

const mapWaypointSources = new Set(['manual', 'objective', 'rumor', 'treasure']);

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
    entityIds: new Set(Object.keys(registry.entities)),
    visualPrefabIds: new Set(registry.visualPrefabs.map((prefab) => prefab.id)),
    professionIds: new Set(registry.professions.clusters.map((profession) => profession.id)),
    masteryIds: new Set(registry.professions.milestones.map((milestone) => milestone.id)),
    economyCategories: new Set(economyCategories)
  };

  checkDuplicateIds(context, 'areas', Object.values(registry.areas).map((area) => area.id));
  checkDuplicateIds(context, 'items', Object.values(registry.items).map((item) => item.id));
  checkDuplicateIds(context, 'build pieces', registry.buildPieces.map((piece) => piece.id));
  checkDuplicateIds(context, 'recipes', registry.recipes.map((recipe) => recipe.id));
  checkDuplicateIds(context, 'spells', Object.values(registry.spells).map((spell) => spell.id));
  checkDuplicateIds(context, 'skills', registry.skills.map((skill) => skill.id));
  checkDuplicateIds(context, 'profession clusters', registry.professions.clusters.map((profession) => profession.id));
  checkDuplicateIds(context, 'profession milestones', registry.professions.milestones.map((milestone) => milestone.id));
  checkDuplicateIds(context, 'profession contracts', registry.professions.contracts.map((contract) => contract.id));
  checkDuplicateIds(context, 'resources', Object.values(registry.resources).map((resource) => resource.id));
  checkDuplicateIds(context, 'resource placements', registry.resourcePlacements.map((placement) => placement.id));
  checkDuplicateIds(context, 'quests', Object.values(registry.quests).map((quest) => quest.id));
  checkDuplicateIds(context, 'entities', Object.values(registry.entities).map((entity) => entity.id));
  checkDuplicateIds(context, 'living world events', registry.events.map((event) => event.type));
  checkDuplicateIds(context, 'map markers', registry.mapMarkers.map((marker) => marker.id));
  checkDuplicateIds(context, 'work orders', registry.economy.workOrders.map((order) => order.id));
  checkDuplicateIds(context, 'market orders', registry.economy.marketOrders.map((order) => order.id));
  checkDuplicateIds(context, 'housing tiers', registry.housing.tiers.map((tier) => String(tier.tier)));
  checkDuplicateIds(context, 'housing pieces', Object.values(registry.housing.pieces).map((piece) => piece.pieceId));
  checkDuplicateIds(context, 'risk zone rules', Object.values(registry.riskZones.rules).map((rule) => rule.id));
  checkDuplicateIds(context, 'treasure maps', Object.values(registry.treasure.maps).map((map) => map.id));
  checkDuplicateIds(context, 'secrets', Object.values(registry.treasure.secrets).map((secret) => secret.id));
  checkDuplicateIds(context, 'visual prefabs', registry.visualPrefabs.map((prefab) => prefab.id));

  validateItems(context);
  validateVisualPrefabs(context);
  validateBuildPieces(context);
  validateRecipes(context);
  validateSpells(context);
  validateProfessions(context);
  validateResources(context);
  validateEntities(context);
  validateEvents(context);
  validateMapMarkers(context);
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
  const requiredVisualItems = new Set(['axe', 'pickaxe', 'torch', 'bandage', 'arrow']);
  Object.entries(context.registry.items).forEach(([key, item]) => {
    if (key !== item.id) context.errors.push(`item "${key}" has mismatched id "${item.id}"`);
    if (!item.name.trim()) context.errors.push(`item ${item.id} is missing required name`);
    if (!item.icon?.shape || !item.icon.primary) context.errors.push(`item ${item.id} is missing icon descriptor`);
    if (item.maxStack <= 0 || item.weight < 0 || item.value < 0) context.errors.push(`item ${item.id} has invalid stack, weight, or value`);
    if (item.requiredAmmo) requireItem(context, item.requiredAmmo, `item ${item.id}.requiredAmmo`);
    if (item.buildPieceId && !context.buildPieceIds.has(item.buildPieceId)) {
      context.errors.push(`item ${item.id}.buildPieceId references missing build piece "${item.buildPieceId}"`);
    }
    if (item.skillUsed) requireSkill(context, item.skillUsed, `item ${item.id}.skillUsed`);
    if (item.supportSkill) requireSkill(context, item.supportSkill, `item ${item.id}.supportSkill`);
    if (item.visualPrefabId && !context.visualPrefabIds.has(item.visualPrefabId)) {
      context.errors.push(`item ${item.id}.visualPrefabId references missing visual prefab "${item.visualPrefabId}"`);
    }
    if (!item.visualPrefabId && (item.equipmentSlot || requiredVisualItems.has(item.id))) {
      context.warnings.push(`item ${item.id} has no visualPrefabId; renderer will use generic procedural mapping`);
    }
  });
}

function validateVisualPrefabs(context: ValidationContext): void {
  const attachPoints = new Set(['head', 'torso', 'back', 'rightHand', 'leftHand', 'belt', 'feet', 'quiver', 'shieldArm']);
  const sourceExtensions = new Set(['.bbmodel', '.vox']);
  const runtimeExtensions = new Set(['.glb', '.gltf', '.obj']);

  context.registry.visualPrefabs.forEach((prefab) => {
    if (!prefab.fallbackProceduralFactory) context.errors.push(`visual prefab ${prefab.id} is missing fallbackProceduralFactory`);
    if (!prefab.iconCameraPreset) context.errors.push(`visual prefab ${prefab.id} is missing icon render preset`);
    if (!prefab.attachPointDefaults.length) context.errors.push(`visual prefab ${prefab.id} has no attach point default`);
    prefab.attachPointDefaults.forEach((attachPoint) => {
      if (!attachPoints.has(attachPoint)) context.errors.push(`visual prefab ${prefab.id} has invalid attachPoint "${attachPoint}"`);
    });
    if (prefab.sourcePath) {
      const lower = prefab.sourcePath.toLowerCase();
      const ext = lower.slice(lower.lastIndexOf('.'));
      if (!prefab.sourcePath.startsWith('assets/source/')) context.errors.push(`visual prefab ${prefab.id} sourcePath must live under assets/source`);
      if (!sourceExtensions.has(ext)) context.errors.push(`visual prefab ${prefab.id} sourcePath uses unsupported source extension "${ext}"`);
      if (prefab.sourceTool === 'blockbench' && ext !== '.bbmodel') context.errors.push(`visual prefab ${prefab.id} blockbench source must be .bbmodel`);
      if (prefab.sourceTool === 'magicavoxel' && ext !== '.vox') context.errors.push(`visual prefab ${prefab.id} magicavoxel source must be .vox`);
    } else if (prefab.sourceTool !== 'procedural') {
      context.warnings.push(`visual prefab ${prefab.id} declares ${prefab.sourceTool} but has no sourcePath yet`);
    }
    if (prefab.runtimePath) {
      const lower = prefab.runtimePath.toLowerCase();
      const ext = lower.slice(lower.lastIndexOf('.'));
      if (!prefab.runtimePath.startsWith('assets/exported/')) context.errors.push(`visual prefab ${prefab.id} runtimePath must live under assets/exported`);
      if (!runtimeExtensions.has(ext)) context.errors.push(`visual prefab ${prefab.id} runtimePath uses unsupported runtime extension "${ext}"`);
    }
    if (prefab.maxRuntimeBytes <= 0) context.errors.push(`visual prefab ${prefab.id} has invalid maxRuntimeBytes`);
    if (prefab.maxRuntimeBytes > 250000) context.errors.push(`visual prefab ${prefab.id} runtime budget is too large (${prefab.maxRuntimeBytes} bytes)`);
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
    if (!recipe.name.trim()) context.errors.push(`recipe ${recipe.id} is missing required name`);
    requireSkill(context, recipe.skill, `recipe ${recipe.id}.skill`);
    if (!stationLabels[recipe.stationType]) context.errors.push(`recipe ${recipe.id} has invalid station "${recipe.stationType}"`);
    recipe.inputs.forEach((input) => requireItemQuantity(context, input, `recipe ${recipe.id}.inputs`));
    recipe.requirements.forEach((requirement) => requireItemQuantity(context, requirement, `recipe ${recipe.id}.requirements`));
    recipe.outputs.forEach((output) => requireItemQuantity(context, output, `recipe ${recipe.id}.outputs`));
    requireItem(context, recipe.outputItemId, `recipe ${recipe.id}.outputItemId`);
    if (recipe.toolRequired) requireItem(context, recipe.toolRequired, `recipe ${recipe.id}.toolRequired`);
    if (recipe.outputQuantity <= 0 || recipe.duration < 0 || recipe.level < 0) context.errors.push(`recipe ${recipe.id} has invalid output, duration, or level`);
  });
}

function validateSpells(context: ValidationContext): void {
  Object.entries(context.registry.spells).forEach(([key, spell]) => {
    if (key !== spell.id) context.errors.push(`spell "${key}" has mismatched id "${spell.id}"`);
    if (!spell.displayName.trim() || !spell.description.trim()) context.errors.push(`spell ${spell.id} is missing display text`);
    if (!spell.iconDescriptor?.shape || !spell.iconDescriptor.primary) context.errors.push(`spell ${spell.id} is missing icon descriptor`);
    requireSkill(context, 'Magery', `spell ${spell.id}.school`);
    spell.reagents.forEach((reagent) => requireItemQuantity(context, reagent, `spell ${spell.id}.reagents`));
    if (spell.manaCost < 0 || spell.castTime < 0 || spell.cooldown < 0 || spell.circle <= 0 || spell.range < 0) {
      context.errors.push(`spell ${spell.id} has invalid timing, circle, range, or cost`);
    }
  });
}

function validateProfessions(context: ValidationContext): void {
  context.registry.professions.clusters.forEach((profession) => {
    if (!profession.title.trim() || !profession.summary.trim() || !profession.suggestedGoal.trim()) {
      context.errors.push(`profession ${profession.id} is missing required title, summary, or suggested goal`);
    }
    profession.skills.forEach((skill) => requireSkill(context, skill, `profession ${profession.id}.skills`));

    checkDuplicateIds(context, `profession ${profession.id} nodes`, profession.nodes.map((node) => node.id));
    const nodeIds = new Set(profession.nodes.map((node) => node.id));
    profession.nodes.forEach((node) => validateProfessionNode(context, profession.id, node));
    profession.edges.forEach((edge) => {
      if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
        context.errors.push(`profession ${profession.id} edge ${edge.from} -> ${edge.to} references missing node`);
      }
      if (!edge.label.trim()) context.warnings.push(`profession ${profession.id} edge ${edge.from} -> ${edge.to} has no label`);
    });
  });

  context.registry.professions.milestones.forEach((milestone) => {
    if (!context.professionIds.has(milestone.professionId)) context.errors.push(`mastery ${milestone.id} references missing profession "${milestone.professionId}"`);
    if (!milestone.title.trim() || !milestone.description.trim() || !milestone.reward.trim() || !milestone.unlockMessage.trim()) {
      context.errors.push(`mastery ${milestone.id} is missing required display or reward text`);
    }
    milestone.requirements.forEach((requirement) => validateMasteryRequirement(context, `mastery ${milestone.id}.requirements`, requirement));
    milestone.visibleWhen.forEach((requirement) => validateMasteryRequirement(context, `mastery ${milestone.id}.visibleWhen`, requirement));
  });

  context.registry.professions.contracts.forEach((contract) => {
    if (!context.professionIds.has(contract.professionId)) context.errors.push(`profession contract ${contract.id} references missing profession "${contract.professionId}"`);
    if (!contract.title.trim() || !contract.teaches.trim()) context.errors.push(`profession contract ${contract.id} is missing required title or teaching text`);
    contract.skills.forEach((skill) => requireSkill(context, skill, `profession contract ${contract.id}.skills`));
    contract.objectives.forEach((objective) => {
      if (!objective.id.trim() || !objective.label.trim()) context.errors.push(`profession contract ${contract.id} has objective missing id or label`);
      if (objective.required <= 0) context.errors.push(`profession contract ${contract.id}.${objective.id} has invalid requirement`);
      objective.skills.forEach((skill) => requireSkill(context, skill, `profession contract ${contract.id}.${objective.id}.skills`));
    });
  });
}

function validateProfessionNode(context: ValidationContext, professionId: string, node: ContentRegistry['professions']['clusters'][number]['nodes'][number]): void {
  if (!node.label.trim() || !node.description.trim()) context.errors.push(`profession ${professionId} node ${node.id} is missing required label or description`);
  if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) context.errors.push(`profession ${professionId} node ${node.id} has invalid graph coordinates`);
  if (!node.ref) return;

  if (node.type === 'skill') requireSkill(context, node.ref, `profession ${professionId} node ${node.id}`);
  if (node.type === 'tool') requireItem(context, node.ref, `profession ${professionId} node ${node.id}`);
  if (node.type === 'spell' && !context.spellIds.has(node.ref)) context.errors.push(`profession ${professionId} node ${node.id} references missing spell "${node.ref}"`);
  if (node.type === 'recipe' && !context.recipeIds.has(node.ref)) context.errors.push(`profession ${professionId} node ${node.id} references missing recipe "${node.ref}"`);
  if (node.type === 'resource' && !context.resourceIds.has(node.ref) && !context.itemIds.has(node.ref)) {
    context.errors.push(`profession ${professionId} node ${node.id} references missing resource or item "${node.ref}"`);
  }
  if (node.type === 'output' && !context.itemIds.has(node.ref) && !context.recipeIds.has(node.ref)) {
    context.errors.push(`profession ${professionId} node ${node.id} references missing output item or recipe "${node.ref}"`);
  }
  if (node.type === 'station' && !stationLabels[node.ref as keyof typeof stationLabels] && !context.buildPieceIds.has(node.ref)) {
    context.errors.push(`profession ${professionId} node ${node.id} references missing station or build piece "${node.ref}"`);
  }
  if (node.type === 'milestone' && !context.masteryIds.has(node.ref)) context.errors.push(`profession ${professionId} node ${node.id} references missing mastery milestone "${node.ref}"`);
}

function validateMasteryRequirement(context: ValidationContext, owner: string, requirement: ContentRegistry['professions']['milestones'][number]['requirements'][number]): void {
  if (requirement.type === 'skill') {
    requireSkill(context, requirement.skillId, owner);
    if (requirement.value < 0) context.errors.push(`${owner} has invalid skill value ${requirement.value}`);
  }
  if (requirement.type === 'quest' && !context.registry.quests[requirement.questId]) context.errors.push(`${owner} references missing quest "${requirement.questId}"`);
  if (requirement.type === 'spellKnown' && !context.spellIds.has(requirement.spellId)) context.errors.push(`${owner} references missing spell "${requirement.spellId}"`);
  if (requirement.type === 'recipeCrafted' && !context.recipeIds.has(requirement.recipeId)) context.errors.push(`${owner} references missing recipe "${requirement.recipeId}"`);
  if (requirement.type === 'itemOwned') requireItemQuantity(context, requirement, owner);
  if (requirement.type === 'areaDiscovered') requireArea(context, requirement.areaId, owner);
  if (requirement.type === 'secretFound' && !context.registry.treasure.secrets[requirement.secretId]) context.errors.push(`${owner} references missing secret "${requirement.secretId}"`);
  if (requirement.type === 'workOrdersCompleted' && requirement.count <= 0) context.errors.push(`${owner} has invalid work order count ${requirement.count}`);
  if (requirement.type === 'housingPlaced' && requirement.count <= 0) context.errors.push(`${owner} has invalid housing count ${requirement.count}`);
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
    validateEconomyCategory(context, order.category, `work order ${order.id}.category`);
    requireItem(context, order.itemId, `work order ${order.id}.itemId`);
    requireSkill(context, order.skill, `work order ${order.id}.skill`);
    if (order.issuerNpcId && !context.entityIds.has(order.issuerNpcId)) context.errors.push(`work order ${order.id} references missing issuer "${order.issuerNpcId}"`);
    order.requiredItems?.forEach((requirement) => requireItemQuantity(context, requirement, `work order ${order.id}.requiredItems`));
    order.rewardItems?.forEach((reward) => requireItemQuantity(context, reward, `work order ${order.id}.rewardItems`));
    order.rewardVoucherItems?.forEach((reward) => requireItemQuantity(context, reward, `work order ${order.id}.rewardVoucherItems`));
    order.rewardRecipeIds?.forEach((recipeId) => {
      if (!context.recipeIds.has(recipeId)) context.errors.push(`work order ${order.id}.rewardRecipeIds references missing recipe "${recipeId}"`);
    });
    if (order.rewardDiscount) {
      validateEconomyCategory(context, order.rewardDiscount.category, `work order ${order.id}.rewardDiscount.category`);
      if (!order.rewardDiscount.label.trim() || order.rewardDiscount.percent <= 0 || order.rewardDiscount.percent > 100 || order.rewardDiscount.duration <= 0) {
        context.errors.push(`work order ${order.id}.rewardDiscount has invalid label, percent, or duration`);
      }
    }
    order.rewardSkillHints?.forEach((skill) => requireSkill(context, skill, `work order ${order.id}.rewardSkillHints`));
    if (order.quantity <= 0 || order.rewardGold < 0) context.errors.push(`work order ${order.id} has invalid quantity or reward`);
  });
  context.registry.economy.marketOrders.forEach((order) => {
    validateEconomyCategory(context, order.category, `market order ${order.id}.category`);
    requireItem(context, order.itemId, `market order ${order.id}.itemId`);
    if (order.issuerId?.startsWith('npc_') && !context.entityIds.has(order.issuerId)) context.errors.push(`market order ${order.id} references missing issuer "${order.issuerId}"`);
    if (order.quantity <= 0 || order.unitPrice <= 0) context.errors.push(`market order ${order.id} has invalid quantity or unit price`);
  });
  context.registry.economy.unlockedRecipeIds.forEach((recipeId) => {
    if (!context.recipeIds.has(recipeId)) context.errors.push(`economy.unlockedRecipeIds references missing recipe "${recipeId}"`);
  });
  context.registry.economy.activeDiscounts.forEach((discount) => {
    validateEconomyCategory(context, discount.category, `economy discount ${discount.id}.category`);
    if (!discount.label.trim() || discount.percent <= 0 || discount.percent > 100 || discount.expiresAt <= discount.startedAt) {
      context.errors.push(`economy discount ${discount.id} has invalid label, percent, or timing`);
    }
  });
  context.registry.economy.demandSignals.forEach((signal) => {
    if (!context.registry.events.some((event) => event.type === signal.eventType)) context.errors.push(`economy demand signal ${signal.id} references missing event "${signal.eventType}"`);
    signal.affected.forEach((category) => validateEconomyCategory(context, category, `economy demand signal ${signal.id}.affected`));
  });
}

function validateEvents(context: ValidationContext): void {
  context.registry.events.forEach((event) => {
    if (!event.title.trim() || !event.rumor.trim() || !event.visibleChange.trim() || !event.cleanup.trim()) {
      context.errors.push(`event ${event.type} is missing required display, rumor, or cleanup text`);
    }
    requireArea(context, event.area, `event ${event.type}.area`);
    event.affectedLocations.forEach((areaId) => requireArea(context, areaId, `event ${event.type}.affectedLocations`));
    if (event.duration <= 0) context.errors.push(`event ${event.type} has invalid duration`);
    validateVec3(context, event.position, `event ${event.type}.position`);
    event.economyImpact.forEach((impact) => {
      if (!context.economyCategories.has(impact) && !context.itemIds.has(impact)) {
        context.warnings.push(`event ${event.type}.economyImpact "${impact}" is not a known economy category or item id`);
      }
    });
    if (!event.rumorSources.length || !event.gameplayHooks.length || !event.triggerConditions.length) {
      context.warnings.push(`event ${event.type} has sparse authoring hooks`);
    }
  });
}

function validateMapMarkers(context: ValidationContext): void {
  context.registry.mapMarkers.forEach((marker) => {
    requireArea(context, marker.areaId, `map marker ${marker.id}.areaId`);
    if (!marker.label.trim()) context.errors.push(`map marker ${marker.id} is missing required label`);
    validateVec3(context, marker.position, `map marker ${marker.id}.position`);
    if (!mapWaypointSources.has(marker.source)) context.errors.push(`map marker ${marker.id} has invalid source "${marker.source}"`);
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

function validateEconomyCategory(context: ValidationContext, category: string | undefined, owner: string): void {
  if (category && !context.economyCategories.has(category)) context.errors.push(`${owner} references missing economy category "${category}"`);
}

function validateVec3(context: ValidationContext, position: Vec3, owner: string): void {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y) || !Number.isFinite(position.z)) context.errors.push(`${owner} has invalid coordinates`);
}
