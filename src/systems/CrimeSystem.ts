import { zoneForArea } from '../data/riskZones';
import { itemDefs } from '../data/items';
import { createId } from '../game/GameState';
import type { ContainerEntity, CriminalActionType, GameState, NpcEntity, ReputationStatus, TargetRef } from '../game/types';
import { addSystemMessage } from './ChatSystem';
import { addItem, getItemCount, removeItems } from './InventorySystem';
import { addFloatingText } from './LootSystem';
import { attemptSkillUse, getSkillValue } from './SkillSystem';

export function updateReputation(state: GameState): void {
  const rep = state.player.reputation;
  if (rep.status === 'criminal' && rep.recentCriminalUntil > 0 && rep.recentCriminalUntil <= state.clock) {
    rep.status = rep.townStanding < -10 ? 'outlaw' : rep.townStanding < 0 ? 'suspicious' : 'neutral';
    rep.recentCriminalUntil = 0;
    addSystemMessage(state, `Your criminal flag fades. Standing: ${rep.status}.`);
  }
}

export function adjustTownStanding(state: GameState, amount: number): void {
  const rep = state.player.reputation;
  rep.townStanding = Math.max(-100, Math.min(100, rep.townStanding + amount));
  if (rep.status !== 'criminal' && rep.townStanding >= 15) rep.status = 'lawful';
}

export function zoneStatus(state: GameState) {
  return zoneForArea(state.player.currentArea);
}

export function protectedContainerNotice(state: GameState, container: ContainerEntity): boolean {
  if (!container.protected) return false;
  state.ui.prompt = `${container.name} is protected town property. Use Snoop or Steal deliberately if you want to risk a crime.`;
  addSystemMessage(state, state.ui.prompt);
  return true;
}

export function attemptSnoopContainer(state: GameState, target: TargetRef): boolean {
  const container = resolveContainer(state, target);
  if (!container) {
    state.ui.prompt = 'Snooping needs a container target.';
    return false;
  }
  if (!container.protected && container.accessRule !== 'private') {
    const contents = describeContainerContents(container);
    state.ui.prompt = `${container.name}: ${contents}`;
    attemptSkillUse(state, 'Snooping', { verb: 'snoop', difficulty: 18, success: true, targetId: container.id, relatedSkills: ['Detect Hidden'] });
    return true;
  }
  if (!acknowledgeCrimeWarning(state, 'snoop', `${container.name} is protected. Snoop again to risk witnesses and a suspicious flag.`)) return false;
  const skill = getSkillValue(state, 'Snooping');
  const success = Math.random() * 100 < Math.max(25, Math.min(92, 52 + skill * 0.55 - witnessPressure(state) * 8));
  const witness = witnessCheck(state, container.position, success ? 0.55 : 0.82);
  attemptSkillUse(state, 'Snooping', { verb: 'snoop', difficulty: 24 + witness.witnessIds.length * 6, success, targetId: container.id, relatedSkills: ['Hiding', 'Stealth'] });
  if (witness.detected) registerCrime(state, 'snoop', container.id, 'minor', witness.witnessIds);
  state.ui.prompt = success ? `${container.name}: ${describeContainerContents(container)}` : 'You fumble the snoop attempt.';
  return success;
}

export function attemptStealFromContainer(state: GameState, target: TargetRef): boolean {
  const container = resolveContainer(state, target);
  if (!container) {
    state.ui.prompt = 'Stealing needs a container target.';
    return false;
  }
  const rule = zoneForArea(state.player.currentArea);
  if (!container.protected && rule.lootRules !== 'protected') {
    state.ui.prompt = 'That container is not protected. Open it normally.';
    return false;
  }
  if (!acknowledgeCrimeWarning(state, 'steal', `${container.name} is protected. Steal again to deliberately risk a criminal flag and guard response.`)) return false;
  const reward = container.loot.find((entry) => entry.quantity > 0);
  if (!reward && container.gold <= 0) {
    state.ui.prompt = `${container.name} has nothing obvious to steal.`;
    return false;
  }
  const stealing = getSkillValue(state, 'Stealing');
  const hiding = getSkillValue(state, 'Hiding');
  const success = Math.random() * 100 < Math.max(18, Math.min(88, 42 + stealing * 0.58 + hiding * 0.12 - witnessPressure(state) * 9));
  const witness = witnessCheck(state, container.position, success ? 0.62 : 0.9);
  attemptSkillUse(state, 'Stealing', { verb: 'steal', difficulty: 30 + witness.witnessIds.length * 6, success, targetId: container.id, relatedSkills: ['Snooping', 'Hiding'] });
  if (!success) {
    if (witness.detected) registerCrime(state, 'steal', container.id, 'minor', witness.witnessIds);
    state.ui.prompt = 'The theft fails before you lift anything.';
    return false;
  }
  if (reward) {
    if (!addItem(state.player.inventory, reward.itemId, 1)) {
      state.ui.prompt = 'Your pack is full.';
      return false;
    }
    reward.quantity -= 1;
    addSystemMessage(state, `You steal ${itemDefs[reward.itemId]?.name ?? reward.itemId}.`);
  } else {
    state.player.gold += Math.min(6, container.gold);
    container.gold = Math.max(0, container.gold - 6);
  }
  if (witness.detected) registerCrime(state, 'steal', container.id, 'minor', witness.witnessIds);
  else state.ui.prompt = 'You slip the item away unnoticed.';
  return true;
}

export function handleInnocentAttack(state: GameState, entityId: string | null | undefined): boolean {
  const entity = entityId ? state.entities[entityId] : null;
  if (!entity || (entity.kind !== 'npc' && entity.kind !== 'social')) return false;
  const rule = zoneForArea(state.player.currentArea);
  if (rule.canAttackNPCs) return false;
  if (!acknowledgeCrimeWarning(state, 'attack_innocent', `Attacking ${entity.name} here is a major crime. Attack again to deliberately draw guards.`)) return true;
  const witness = witnessCheck(state, entity.position, 1);
  registerCrime(state, 'attack_innocent', entity.id, 'major', witness.witnessIds);
  state.ui.prompt = `You threaten ${entity.name}. Guards are responding.`;
  return true;
}

export function inspectCrimeScene(state: GameState, target: TargetRef): boolean {
  const position = target?.kind === 'entity' ? state.entities[target.entityId]?.position : target?.kind === 'tile' ? target.position : state.player.position;
  const nearby = state.world.crimeEvents
    .filter((event) => event.area === state.player.currentArea && state.clock - event.createdAt < 180)
    .slice(-3);
  const success = nearby.length > 0;
  attemptSkillUse(state, 'Forensic Evaluation', { verb: 'forensics', difficulty: 20, success, relatedSkills: ['Detect Hidden'] });
  state.ui.prompt = success ? `Recent crime traces: ${nearby.map((event) => event.type).join(', ')}.` : 'No recent crime traces here.';
  addFloatingText(state, success ? 'Tracks' : 'Clear', position ?? state.player.position, success ? '#d9bd89' : '#8bd9ff');
  return success;
}

export function begNearby(state: GameState): boolean {
  const npc = Object.values(state.entities)
    .filter((entity): entity is NpcEntity => (entity.kind === 'npc' || entity.kind === 'social') && entity.area === state.player.currentArea)
    .map((entity) => ({ entity, dist: Math.hypot(entity.position.x - state.player.position.x, entity.position.z - state.player.position.z) }))
    .sort((a, b) => a.dist - b.dist)[0];
  if (!npc || npc.dist > 4) {
    state.ui.prompt = 'No one nearby is listening.';
    return false;
  }
  const begging = getSkillValue(state, 'Begging');
  const success = Math.random() * 100 < Math.max(20, Math.min(72, 36 + begging * 0.38 + state.player.reputation.townStanding * 0.2));
  attemptSkillUse(state, 'Begging', { verb: 'beg', difficulty: 18, success, targetId: npc.entity.id });
  if (!success) {
    state.ui.prompt = `${npc.entity.name} waves you off.`;
    return false;
  }
  const coins = Math.max(1, Math.round(1 + begging / 25));
  state.player.gold += coins;
  state.ui.prompt = `${npc.entity.name} gives you ${coins}g and a rumor.`;
  addSystemMessage(state, state.ui.prompt);
  return true;
}

function registerCrime(state: GameState, type: CriminalActionType, targetId: string | undefined, severity: 'minor' | 'major', witnessIds: string[]): void {
  const rep = state.player.reputation;
  const detected = witnessIds.length > 0 || zoneForArea(state.player.currentArea).guardResponse === 'guarded';
  if (!detected) return;
  rep.lastCrimeAt = state.clock;
  rep.recentCriminalUntil = state.clock + (severity === 'major' ? 120 : 75);
  rep.karma -= severity === 'major' ? 8 : 3;
  rep.townStanding = Math.max(-100, rep.townStanding - (severity === 'major' ? 12 : type === 'steal' ? 7 : 4));
  if (severity === 'major') rep.aggressionCount += 1;
  rep.status = severity === 'major' || type === 'steal' ? 'criminal' : 'suspicious';
  const fine = severity === 'major' ? 35 : type === 'steal' ? 18 : 8;
  rep.finesOwed += fine;
  state.player.gold = Math.max(0, state.player.gold - Math.min(state.player.gold, fine));
  state.world.crimeEvents.push({
    id: createId('crime'),
    type,
    area: state.player.currentArea,
    targetId,
    detected,
    witnessIds,
    severity,
    createdAt: state.clock,
    reputationStatus: rep.status
  });
  state.world.crimeEvents = state.world.crimeEvents.slice(-30);
  addSystemMessage(state, guardMessage(state, severity, fine, witnessIds));
  addFloatingText(state, severity === 'major' ? 'Guard Horn' : 'Witnessed', state.player.position, severity === 'major' ? '#ff7777' : '#ffcf57');
}

function guardMessage(state: GameState, severity: 'minor' | 'major', fine: number, witnessIds: string[]): string {
  const names = witnessIds
    .map((id) => state.entities[id]?.name)
    .filter(Boolean)
    .slice(0, 2)
    .join(', ');
  if (severity === 'major') return `${names || 'A guard'} shouts for help. You are criminally flagged and fined ${fine}g.`;
  return `${names || 'A witness'} notices. You are flagged and fined ${fine}g.`;
}

function acknowledgeCrimeWarning(state: GameState, type: CriminalActionType, message: string): boolean {
  if (!state.player.reputation.warningAcknowledged[type]) {
    state.player.reputation.warningAcknowledged[type] = true;
    state.ui.prompt = message;
    addSystemMessage(state, message);
    return false;
  }
  return true;
}

function witnessCheck(state: GameState, position: { x: number; z: number }, severityMultiplier: number): { detected: boolean; witnessIds: string[] } {
  const witnesses = Object.values(state.entities).filter((entity) => {
    if (entity.area !== state.player.currentArea || (entity.kind !== 'npc' && entity.kind !== 'social')) return false;
    const range = entity.kind === 'npc' && entity.role === 'guard' ? 10 : 7;
    return Math.hypot(entity.position.x - position.x, entity.position.z - position.z) <= range;
  });
  const witnessIds = witnesses.filter((entity) => Math.random() < detectionChance(state, entity as NpcEntity, severityMultiplier)).map((entity) => entity.id);
  return { detected: witnessIds.length > 0, witnessIds };
}

function detectionChance(state: GameState, witness: NpcEntity, severityMultiplier: number): number {
  let chance = witness.role === 'guard' ? 0.92 : 0.46;
  if (state.player.currentArea === 'town') chance += 0.12;
  if (state.world.time.phase === 'night') chance -= 0.08;
  if (state.player.combatProfile.hidden) chance -= 0.28;
  chance -= Math.min(0.22, getSkillValue(state, 'Stealth') / 450);
  return Math.max(0.08, Math.min(0.98, chance * severityMultiplier));
}

function witnessPressure(state: GameState): number {
  return Object.values(state.entities).filter((entity) => entity.area === state.player.currentArea && (entity.kind === 'npc' || entity.kind === 'social')).length / 5;
}

function resolveContainer(state: GameState, target: TargetRef): ContainerEntity | null {
  const entity = target?.kind === 'entity' ? state.entities[target.entityId] : null;
  return entity?.kind === 'container' ? entity : null;
}

function describeContainerContents(container: ContainerEntity): string {
  const loot = container.loot.filter((entry) => entry.quantity > 0).map((entry) => `${itemDefs[entry.itemId]?.name ?? entry.itemId} x${entry.quantity}`);
  if (container.gold > 0) loot.push(`${container.gold}g`);
  return loot.length ? loot.join(', ') : 'empty';
}
