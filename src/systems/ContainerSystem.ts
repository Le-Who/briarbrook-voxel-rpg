import { itemDefs } from '../data/items';
import type { ContainerEntity, GameState, TargetRef } from '../game/types';
import { addSystemMessage } from './ChatSystem';
import { addItem, getItemCount, removeItems } from './InventorySystem';
import { addFloatingText } from './LootSystem';
import { recordQuestEvent } from './QuestSystem';
import { attemptSkillUse, getSkillValue } from './SkillSystem';
import { recordDamageTaken, recordGoldDelta } from './TelemetrySystem';
import { protectedContainerNotice } from './CrimeSystem';

export function interactContainer(state: GameState, container: ContainerEntity): void {
  if (container.hidden) {
    state.ui.prompt = 'Something is concealed here.';
    return;
  }
  if (container.opened) {
    state.ui.prompt = `${container.name} is empty.`;
    return;
  }
  if (protectedContainerNotice(state, container)) return;
  if (container.trap?.armed && container.trap.detected) {
    const warning = 'The lock is trapped. Detect Hidden revealed a dart mechanism.';
    state.ui.prompt = warning;
    addSystemMessage(state, warning);
    const removeTrap = getSkillValue(state, 'Remove Trap');
    const success = Math.random() * 100 < Math.max(20, Math.min(92, 48 + removeTrap * 0.55 - container.trap.difficulty));
    attemptSkillUse(state, 'Remove Trap', { verb: 'trap', difficulty: container.trap.difficulty, success, targetId: container.id, relatedSkills: ['Detect Hidden'] });
    if (success) {
      container.trap.armed = false;
      state.ui.prompt = 'You disarm the warding trap.';
      addFloatingText(state, 'Disarmed', container.position, '#8bd9ff');
    } else {
      triggerContainerTrap(state, container);
      return;
    }
  }
  if (container.locked) {
    if (getItemCount(state.player.inventory, 'lockpick') <= 0) {
      state.ui.prompt = `${container.name} is locked. A lockpick or Unlock Minor could open it.`;
      return;
    }
    const lockpicking = getSkillValue(state, 'Lockpicking');
    const success = Math.random() * 100 < Math.max(18, Math.min(92, 45 + lockpicking * 0.65 - container.lockDifficulty));
    attemptSkillUse(state, 'Lockpicking', { verb: 'lockpick', difficulty: container.lockDifficulty, success, targetId: container.id, relatedSkills: ['Detect Hidden'] });
    if (!success) {
        if (Math.random() < 0.35) {
          removeItems(state.player.inventory, 'lockpick', 1);
          addSystemMessage(state, 'Your lockpick breaks.');
        }
        if (container.trap?.armed && !container.trap.detected) triggerContainerTrap(state, container);
        else state.ui.prompt = Math.random() < 0.35 ? 'You nearly had it.' : 'The lock resists.';
        return;
    }
    container.locked = false;
    state.ui.prompt = 'The lock clicks open.';
  }
  if (container.trap?.armed && !container.trap.detected) {
    triggerContainerTrap(state, container);
    return;
  }
  openContainer(state, container);
}

export function unlockContainerWithSpell(state: GameState, target: TargetRef): boolean {
  const container = target?.kind === 'entity' ? state.entities[target.entityId] : null;
  if (!container || container.kind !== 'container') return false;
  if (container.lockDifficulty > 35) {
    state.ui.prompt = `${container.name} is too complex for Unlock Minor. Use lockpicks or a stronger key.`;
    return true;
  }
  if (container.opened) {
    state.ui.prompt = `${container.name} is already open.`;
    return true;
  }
  container.locked = false;
  if (container.trap) container.trap.detected = true;
  attemptSkillUse(state, 'Lockpicking', { verb: 'lockpick', difficulty: Math.max(20, container.lockDifficulty - 8), success: true, targetId: container.id, relatedSkills: ['Magery'] });
  addFloatingText(state, 'Unlocked', container.position, '#dbe7ff');
  state.ui.prompt = `${container.name} unlocks with a blue snap.`;
  return true;
}

export function revealMagicalContainers(state: GameState): number {
  let revealed = 0;
  for (const entity of Object.values(state.entities)) {
    if (entity.kind !== 'container' || entity.area !== state.player.currentArea || entity.opened) continue;
    if (entity.hidden) {
      entity.hidden = false;
      revealed += 1;
    }
    if (entity.trap && !entity.trap.detected) {
      entity.trap.detected = true;
      revealed += 1;
    }
  }
  if (revealed) {
    attemptSkillUse(state, 'Detect Hidden', { verb: 'detect', difficulty: 24, success: true, relatedSkills: ['Item Identification'] });
  }
  return revealed;
}

function openContainer(state: GameState, container: ContainerEntity): void {
  container.opened = true;
  container.blocksMovement = false;
  if (container.gold > 0) {
    state.player.gold += container.gold;
    recordGoldDelta(state, container.gold);
  }
  container.loot.forEach((reward) => {
    addItem(state.player.inventory, reward.itemId, reward.quantity);
    addSystemMessage(state, `You recover ${itemDefs[reward.itemId]?.name ?? reward.itemId} x${reward.quantity}.`);
  });
  recordQuestEvent(state, { type: 'open_container', containerId: container.id });
  addSystemMessage(state, `${container.name} opens. You take ${container.gold}g and the contents.`);
  addFloatingText(state, 'Opened', container.position, '#f0c957');
  state.ui.prompt = `${container.name} opened.`;
}

export function triggerContainerTrap(state: GameState, container: ContainerEntity): void {
  if (!container.trap?.armed) return;
  const damage = container.trap.damage;
  state.player.health = Math.max(0, state.player.health - damage);
  state.combat.lastDamagedAt = state.clock;
  state.combat.hitFlashes.player = state.clock + 0.18;
  container.trap.armed = false;
  recordDamageTaken(state, damage);
  attemptSkillUse(state, 'Resisting Spells', { verb: 'resist-spell', difficulty: container.trap.difficulty, success: false, targetId: container.id, relatedSkills: ['Focus'] });
  addSystemMessage(state, `${container.name} discharges a warding trap.`);
  addFloatingText(state, `Trap ${damage}`, state.player.position, '#b66dff');
  state.ui.prompt = 'A warding trap snaps open.';
}
