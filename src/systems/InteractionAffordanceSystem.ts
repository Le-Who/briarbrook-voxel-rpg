import { itemDefs } from '../data/items';
import { spellDefs } from '../data/spells';
import { resolveResourceDefinition } from '../data/resources';
import type { Entity, GameState, ResourceNodeEntity, TargetRef } from '../game/types';
import { inspectTargetForTool } from './ResourceSystem';

type ConcreteTarget = NonNullable<TargetRef>;

export type InteractionVerb =
  | 'Move'
  | 'Talk'
  | 'Enter'
  | 'Attack'
  | 'Cast'
  | 'Use Tool'
  | 'Gather'
  | 'Open'
  | 'Pick Lock'
  | 'Inspect'
  | 'Disarm'
  | 'Loot'
  | 'Trade'
  | 'Build'
  | 'Assign'
  | 'Equip'
  | 'Use'
  | 'Target'
  | 'Mark';

export type InteractionCommand =
  | 'target'
  | 'interact'
  | 'talk'
  | 'trade'
  | 'attack'
  | 'gather'
  | 'open'
  | 'pick_lock'
  | 'lockpick'
  | 'disarm'
  | 'detect_hidden'
  | 'remove_trap'
  | 'loot'
  | 'inspect'
  | 'use_tool'
  | 'cast_spell'
  | 'snoop'
  | 'steal'
  | 'follow'
  | 'mark';

export interface InteractionAction {
  verb: InteractionVerb;
  command: InteractionCommand;
  label: string;
  primary?: boolean;
  disabledReason?: string;
}

export interface InteractionDescriptor {
  id: string;
  name: string;
  prompt: string;
  primary: InteractionAction;
  actions: InteractionAction[];
  valid: boolean;
  invalidReason?: string;
}

export function interactionPrompt(state: GameState, target: TargetRef = state.ui.hoverTarget ?? state.ui.selectedTarget): string | null {
  return describeInteraction(state, target)?.prompt ?? null;
}

export function contextActionsForTarget(state: GameState, target: TargetRef): InteractionAction[] {
  return describeInteraction(state, target)?.actions ?? [];
}

export function describeInteraction(state: GameState, target: TargetRef): InteractionDescriptor | null {
  if (!target) return null;
  if (state.ui.targeting) return describeTargeting(state, target);
  if (target.kind === 'entity' || target.kind === 'friendly' || target.kind === 'hostile' || target.kind === 'ground-item') {
    const entity = state.entities[target.entityId];
    return entity ? describeEntity(state, entity) : null;
  }
  if (target.kind === 'tile') {
    const primary = action('Move', 'interact', 'Move');
    return descriptor(`tile:${target.areaId}:${Math.round(target.position.x)},${Math.round(target.position.z)}`, 'Ground', 'Ground - Move', primary, [
      primary,
      action('Inspect', 'inspect', 'Inspect'),
      action('Mark', 'mark', 'Mark on Map')
    ]);
  }
  if (target.kind === 'inventory') {
    const stack = target.owner === 'inventory' ? state.player.inventory.slots[target.slot] : target.owner === 'bank' ? state.player.bank.slots[target.slot] : null;
    const name = stack ? itemDefs[stack.itemId]?.name ?? stack.itemId : 'Empty Slot';
    const primary = action('Use', 'interact', 'Use');
    return descriptor(`inventory:${target.owner}:${target.slot}`, name, `${name} - Use`, primary, [primary, action('Equip', 'interact', 'Equip'), action('Inspect', 'inspect', 'Inspect')]);
  }
  return null;
}

function describeEntity(state: GameState, entity: Entity): InteractionDescriptor {
  if (entity.kind === 'portal') {
    const primary = action('Enter', 'interact', 'Enter');
    return descriptor(entity.id, entity.name, `${entity.name} - Enter (E)`, primary, [primary, action('Inspect', 'inspect', 'Inspect'), action('Mark', 'mark', 'Mark on Map')]);
  }
  if (entity.kind === 'enemy') {
    const primary = action('Target', 'target', 'Target');
    return descriptor(entity.id, entity.name, `${entity.name} - Target`, primary, [
      primary,
      action('Attack', 'attack', 'Attack'),
      action('Cast', 'cast_spell', 'Cast Spell'),
      action('Inspect', 'inspect', 'Inspect'),
      action('Mark', 'mark', 'Mark on Map')
    ]);
  }
  if (entity.kind === 'npc' || entity.kind === 'social') {
    const primary = action('Talk', 'talk', 'Talk');
    const actions = [primary];
    if (entity.role === 'merchant' || entity.tradeInventory || entity.training) actions.push(action('Trade', 'trade', entity.training ? 'Trade / Train' : 'Trade'));
    actions.push(action('Inspect', 'inspect', 'Inspect'), action('Mark', 'mark', 'Mark on Map'));
    return descriptor(entity.id, entity.name, `${entity.name} - Talk (E)`, primary, actions);
  }
  if (entity.kind === 'resource') {
    if (entity.protected) {
      const primary = action('Inspect', 'inspect', 'Protected Tree', 'Town tree is protected.');
      return descriptor(entity.id, entity.name, `${entity.name} - Protected Tree`, primary, [primary, action('Mark', 'mark', 'Mark on Map')], false, 'Town tree is protected.');
    }
    const primary = resourceAction(entity);
    return descriptor(entity.id, entity.name, `${entity.name} - ${defaultResourcePrompt(entity)}`, primary, [primary, action('Inspect', 'inspect', 'Inspect'), action('Mark', 'mark', 'Mark on Map')]);
  }
  if (entity.kind === 'container') {
    const primary = entity.locked ? action('Pick Lock', 'open', 'Pick Lock') : action('Open', 'open', 'Open');
    const prompt = entity.locked ? `${entity.name} - Inspect / Pick Lock` : `${entity.name} - Open (E)`;
    const actions = [
      entity.opened ? action('Open', 'open', 'Open', 'Already open') : primary,
      entity.locked ? action('Pick Lock', 'open', 'Pick Lock') : null,
      entity.trap?.armed ? action('Disarm', 'disarm', entity.trap.detected ? 'Disarm Trap' : 'Detect Trap') : null,
      action('Cast', 'cast_spell', 'Telekinesis'),
      action('Inspect', 'inspect', 'Inspect'),
      action('Mark', 'mark', 'Mark on Map')
    ].filter(Boolean) as InteractionAction[];
    return descriptor(entity.id, entity.name, prompt, primary, uniqueActions(actions));
  }
  if (entity.kind === 'loot') {
    const primary = action('Loot', 'loot', 'Loot');
    return descriptor(entity.id, entity.name, `${entity.name} - Loot (E)`, primary, [primary, action('Inspect', 'inspect', 'Inspect'), action('Mark', 'mark', 'Mark on Map')]);
  }
  const primary = action('Inspect', 'inspect', 'Inspect');
  return descriptor(entity.id, entity.name, `${entity.name} - Inspect`, primary, [primary, action('Mark', 'mark', 'Mark on Map')]);
}

function describeTargeting(state: GameState, target: ConcreteTarget): InteractionDescriptor | null {
  const targeting = state.ui.targeting;
  if (!targeting) return null;
  if (targeting.mode === 'tool' && targeting.toolItemId) return describeToolTarget(state, target, targeting.toolItemId);
  if (targeting.mode === 'spell' && targeting.spellId) return describeSpellTarget(state, target, targeting.spellId);
  if (targeting.mode === 'skill') {
    const name = targetName(state, target);
    const primary = action('Use', 'interact', 'Use Skill');
    return descriptor(targetId(target), name, `${name} - Use ${targeting.skillId ?? 'Skill'}`, primary, [primary, action('Inspect', 'inspect', 'Inspect')]);
  }
  return null;
}

function describeToolTarget(state: GameState, target: ConcreteTarget, toolItemId: string): InteractionDescriptor {
  const name = targetName(state, target);
  const toolName = itemDefs[toolItemId]?.name ?? toolItemId;
  const primary = action('Use Tool', 'use_tool', toolTargetLabel(toolItemId, null));
  if (target.kind === 'entity') {
    const entity = state.entities[target.entityId];
    if (entity?.kind === 'resource') {
      if (entity.protected) {
        const reason = 'Town tree is protected.';
        return descriptor(entity.id, entity.name, `${entity.name} - Protected Tree`, primary, [action('Inspect', 'inspect', 'Inspect')], false, reason);
      }
      if (toolMatchesResource(toolItemId, entity)) {
        const label = toolTargetLabel(toolItemId, entity);
        return descriptor(entity.id, entity.name, `${entity.name} - ${label}`, { ...primary, label }, [{ ...primary, label }, action('Inspect', 'inspect', 'Inspect')]);
      }
      const reason = betterToolReason(entity);
      return descriptor(entity?.id ?? targetId(target), entity?.name ?? name, `${entity?.name ?? name} - ${reason}`, primary, [action('Inspect', 'inspect', 'Inspect')], false, reason);
    }
  }
  const tileLabel = inspectTargetForTool(state, toolItemId, target);
  if (tileLabel) {
    const label = toolTargetLabel(toolItemId, null);
    if (tileLabel === 'Protected Tree') {
      const reason = 'Town tree is protected.';
      return descriptor(targetId(target), tileLabel, `${tileLabel} - ${reason}`, primary, [action('Inspect', 'inspect', 'Inspect')], false, reason);
    }
    return descriptor(targetId(target), tileLabel, `${tileLabel} - ${label}`, { ...primary, label }, [{ ...primary, label }, action('Inspect', 'inspect', 'Inspect')]);
  }
  const reason = `${toolName} cannot be used here.`;
  return descriptor(targetId(target), name, `${name} - ${reason}`, primary, [action('Inspect', 'inspect', 'Inspect')], false, reason);
}

function describeSpellTarget(state: GameState, target: ConcreteTarget, spellId: string): InteractionDescriptor {
  const spell = spellDefs[spellId];
  const name = targetName(state, target);
  const label = spell ? `Cast ${spell.displayName}` : 'Cast Spell';
  const primary = action('Cast', 'cast_spell', label);
  if (!spell) return descriptor(targetId(target), name, `${name} - Unknown spell`, primary, [action('Inspect', 'inspect', 'Inspect')], false, 'Unknown spell.');
  const entityId = targetEntityId(target);
  const entity = entityId ? state.entities[entityId] : null;
  const valid =
    spell.targetType === 'area' ||
    (spell.targetType === 'tile' && target.kind === 'tile') ||
    (spell.targetType === 'entity' && entity?.kind === 'enemy') ||
    (spell.targetType === 'self' && target.kind === 'self') ||
    (spell.targetType === 'container' && entity?.kind === 'container') ||
    (spell.targetType === 'door' && entity?.kind === 'portal');
  if (!valid) {
    const reason = `${spell.displayName} cannot target this.`;
    return descriptor(targetId(target), name, `${name} - ${reason}`, primary, [action('Inspect', 'inspect', 'Inspect')], false, reason);
  }
  return descriptor(targetId(target), name, `${name} - ${label}`, primary, [primary, action('Inspect', 'inspect', 'Inspect')]);
}

function descriptor(id: string, name: string, prompt: string, primary: InteractionAction, actions: InteractionAction[], valid = true, invalidReason?: string): InteractionDescriptor {
  return { id, name, prompt, primary: { ...primary, primary: true }, actions: uniqueActions([{ ...primary, primary: true }, ...actions.filter((entry) => entry.command !== primary.command || entry.label !== primary.label)]), valid, invalidReason };
}

function action(verb: InteractionVerb, command: InteractionCommand, label: string, disabledReason?: string): InteractionAction {
  return { verb, command, label, disabledReason };
}

function resourceAction(entity: ResourceNodeEntity): InteractionAction {
  return action('Gather', 'gather', defaultResourceAction(entity));
}

function defaultResourcePrompt(entity: ResourceNodeEntity): string {
  if (entity.resourceType === 'tree') return 'Use Axe';
  if (entity.resourceType === 'ore') return 'Mine';
  if (entity.resourceType === 'fish') return 'Fish';
  return 'Gather';
}

function defaultResourceAction(entity: ResourceNodeEntity): string {
  if (entity.resourceType === 'tree') return 'Chop with Axe';
  if (entity.resourceType === 'ore') return 'Mine with Pickaxe';
  if (entity.resourceType === 'fish') return 'Fish';
  return 'Gather';
}

function toolTargetLabel(toolItemId: string, entity: ResourceNodeEntity | null): string {
  if (toolItemId === 'axe') return 'Chop with Axe';
  if (toolItemId === 'pickaxe') return 'Mine with Pickaxe';
  if (toolItemId === 'shovel') return 'Dig';
  if (toolItemId === 'fishing_pole') return 'Fish';
  if (entity) return defaultResourceAction(entity);
  return `Use ${itemDefs[toolItemId]?.name ?? toolItemId}`;
}

function toolMatchesResource(toolItemId: string, entity: ResourceNodeEntity): boolean {
  const definition = resolveResourceDefinition(entity);
  return definition.toolItemId === toolItemId;
}

function betterToolReason(entity: ResourceNodeEntity): string {
  const definition = resolveResourceDefinition(entity);
  const tool = friendlyToolName(definition.toolItemId);
  return `A ${tool} would work better.`;
}

function friendlyToolName(toolItemId: string): string {
  if (toolItemId === 'pickaxe') return 'pickaxe';
  if (toolItemId === 'axe') return 'axe';
  if (toolItemId === 'fishing_pole') return 'fishing pole';
  return (itemDefs[toolItemId]?.name ?? toolItemId).toLowerCase();
}

function targetName(state: GameState, target: TargetRef): string {
  if (!target) return 'Target';
  if (target.kind === 'entity' || target.kind === 'hostile' || target.kind === 'friendly' || target.kind === 'ground-item') return state.entities[target.entityId]?.name ?? 'Target';
  if (target.kind === 'tile') return 'Ground';
  if (target.kind === 'self') return state.player.name;
  if (target.kind === 'inventory') return 'Inventory Slot';
  return 'Target';
}

function targetEntityId(target: TargetRef): string | null {
  if (!target) return null;
  return target.kind === 'entity' || target.kind === 'hostile' || target.kind === 'friendly' || target.kind === 'ground-item' ? target.entityId : null;
}

function targetId(target: TargetRef): string {
  if (!target) return 'none';
  if (target.kind === 'entity' || target.kind === 'hostile' || target.kind === 'friendly' || target.kind === 'ground-item') return `entity:${target.entityId}`;
  if (target.kind === 'tile') return `tile:${target.areaId}:${Math.round(target.position.x)},${Math.round(target.position.z)}`;
  if (target.kind === 'inventory') return `inventory:${target.owner}:${target.slot}`;
  return target.kind;
}

function uniqueActions(actions: InteractionAction[]): InteractionAction[] {
  const seen = new Set<string>();
  return actions.filter((entry) => {
    const key = `${entry.command}:${entry.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
