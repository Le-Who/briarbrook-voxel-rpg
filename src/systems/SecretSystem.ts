import { secretDefinitions } from '../data/treasure';
import type { GameState, SecretDefinition, SecretRuntimeState, Vec3 } from '../game/types';
import { addSystemMessage } from './ChatSystem';
import { addFloatingText } from './LootSystem';
import { attemptSkillUse, getSkillValue } from './SkillSystem';

export type SecretRevealMethod = SecretDefinition['revealMethods'][number];

interface RevealSecretsOptions {
  method: SecretRevealMethod;
  origin: Vec3;
  radius?: number;
  train?: boolean;
}

export function revealSecretsNear(state: GameState, options: RevealSecretsOptions): number {
  let revealed = 0;
  const radius = options.radius ?? 7;
  for (const secret of Object.values(secretDefinitions)) {
    if (secret.areaId !== state.player.currentArea) continue;
    if (!secret.revealMethods.includes(options.method)) continue;
    if (Number.isFinite(radius) && distance(options.origin, secret.location) > radius) continue;
    const runtime = runtimeForSecret(state, secret.id);
    if (runtime.opened) continue;
    const skillValue = getSkillValue(state, secret.requiredSkill);
    const autoSuccess = options.method !== 'detect_hidden' || skillValue + 18 >= secret.difficulty;
    const success = autoSuccess || Math.random() * 100 < Math.max(15, Math.min(88, 45 + skillValue * 0.6 - secret.difficulty));
    if (options.train) {
      attemptSkillUse(state, secret.requiredSkill, {
        verb: options.method === 'detect_hidden' ? 'detect' : 'identify',
        difficulty: secret.difficulty,
        success,
        relatedSkills: ['Item Identification', 'Detect Hidden']
      });
    }
    if (!success) continue;
    if (revealSecret(state, secret, runtime, options.method)) revealed += 1;
  }
  return revealed;
}

export function markSecretOpenedByContainer(state: GameState, containerId: string): void {
  for (const secret of Object.values(secretDefinitions)) {
    if (secret.revealedEntityId !== containerId) continue;
    const runtime = runtimeForSecret(state, secret.id);
    runtime.opened = true;
    runtime.revealedUntil = Math.max(runtime.revealedUntil, state.clock);
  }
}

export function markSecretDisarmedByContainer(state: GameState, containerId: string): void {
  for (const secret of Object.values(secretDefinitions)) {
    if (secret.revealedEntityId !== containerId) continue;
    runtimeForSecret(state, secret.id).disarmed = true;
  }
}

export function markSecretTriggeredByContainer(state: GameState, containerId: string): void {
  for (const secret of Object.values(secretDefinitions)) {
    if (secret.revealedEntityId !== containerId) continue;
    runtimeForSecret(state, secret.id).triggered = true;
  }
}

function revealSecret(state: GameState, secret: SecretDefinition, runtime: SecretRuntimeState, method: SecretRevealMethod): boolean {
  const wasRevealed = runtime.revealedUntil > state.clock;
  runtime.revealedUntil = Math.max(runtime.revealedUntil, state.clock + secret.revealDuration);
  let changed = !wasRevealed;

  const entity = secret.revealedEntityId ? state.entities[secret.revealedEntityId] : null;
  if (entity?.kind === 'container') {
    if (entity.hidden) {
      entity.hidden = false;
      changed = true;
    }
    if (entity.trap && !entity.trap.detected) {
      entity.trap.detected = true;
      changed = true;
    }
  }

  if (changed) {
    addFloatingText(state, secretLabel(secret), secret.location, method === 'detect_magic' ? '#6fd4ff' : '#f0c957');
    addSystemMessage(state, `${secretLabel(secret)} revealed in the ${secret.areaId}.`);
  }
  return changed;
}

function runtimeForSecret(state: GameState, secretId: string): SecretRuntimeState {
  state.world.treasure.secrets[secretId] ??= {
    revealedUntil: 0,
    disarmed: false,
    triggered: false,
    opened: false
  };
  return state.world.treasure.secrets[secretId];
}

function secretLabel(secret: SecretDefinition): string {
  if (secret.revealedState === 'sealed_alcove') return 'Sealed Alcove';
  if (secret.revealedState === 'pressure_plate') return 'Pressure Plate';
  if (secret.revealedState === 'treasure_room') return 'Treasure Room';
  if (secret.revealedState === 'trap_warning') return 'Trap Warning';
  return 'Hidden Cache';
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
