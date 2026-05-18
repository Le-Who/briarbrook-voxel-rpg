import type { ActionStateKind, GameState } from '../game/types';
import { addSystemMessage } from './ChatSystem';

const DEFAULT_DURATIONS: Record<ActionStateKind, number> = {
  idle: 0,
  moving: 0.12,
  attacking: 0.38,
  casting: 0,
  gathering: 0,
  stunned: 0.9,
  dead: 0,
  hidden: 0.25,
  interacting: 0.4,
  building: 0.2,
  transitioning: 0.1
};

const INTERRUPTIBLE: Record<ActionStateKind, boolean> = {
  idle: true,
  moving: true,
  attacking: false,
  casting: true,
  gathering: true,
  stunned: false,
  dead: false,
  hidden: true,
  interacting: true,
  building: true,
  transitioning: false
};

export function setPlayerActionState(state: GameState, kind: ActionStateKind, duration = DEFAULT_DURATIONS[kind], source?: string): void {
  state.player.actionState = {
    kind,
    startedAt: state.clock,
    duration,
    endsAt: duration > 0 ? state.clock + duration : state.clock,
    interruptible: INTERRUPTIBLE[kind],
    visualHint: kind,
    source
  };
}

export function refreshPlayerActionState(state: GameState): void {
  const action = state.player.actionState;
  if (action.kind === 'dead') return;
  if (action.kind === 'stunned' && action.endsAt > state.clock) return;
  if ((action.kind === 'moving' || action.kind === 'attacking' || action.kind === 'interacting' || action.kind === 'building' || action.kind === 'hidden' || action.kind === 'transitioning') && action.endsAt > state.clock) return;
  if (state.spellCasting) {
    setPlayerActionState(state, 'casting', state.spellCasting.remaining, state.spellCasting.spellId);
    return;
  }
  if (state.gathering) {
    setPlayerActionState(state, 'gathering', state.gathering.remaining, state.gathering.entityId);
    return;
  }
  if (state.buildMode.active) {
    setPlayerActionState(state, 'building', 0.2, state.buildMode.selectedPieceId);
    return;
  }
  if (state.player.combatProfile.hidden) {
    setPlayerActionState(state, 'hidden', 0.25, 'hiding');
    return;
  }
  const speed = Math.hypot(state.player.movement.velocity.x, state.player.movement.velocity.z);
  if (speed > 0.04 || state.player.targetPosition) {
    setPlayerActionState(state, 'moving', 0.12, state.player.targetPosition ? 'path' : 'intent');
    return;
  }
  if (action.kind !== 'idle') setPlayerActionState(state, 'idle');
}

export function isPlayerStunned(state: GameState): boolean {
  return state.player.actionState.kind === 'stunned' && state.player.actionState.endsAt > state.clock;
}

export function interruptPlayerAction(state: GameState, reason: 'movement' | 'damage' | 'stun' | 'manual', force = false): boolean {
  const action = state.player.actionState;
  if (!force && !action.interruptible) return false;
  let interrupted = false;
  if (state.spellCasting) {
    state.spellCasting = null;
    state.ui.prompt = reason === 'damage' ? 'Your spell is interrupted.' : 'Casting cancelled.';
    addSystemMessage(state, state.ui.prompt);
    interrupted = true;
  }
  if (state.gathering) {
    state.gathering = null;
    state.ui.prompt = reason === 'damage' ? 'Gathering interrupted by the hit.' : 'Gathering interrupted.';
    addSystemMessage(state, state.ui.prompt);
    interrupted = true;
  }
  if (state.spellEffects.some((effect) => effect.type === 'meditation')) {
    state.spellEffects = state.spellEffects.filter((effect) => effect.type !== 'meditation');
    if (reason === 'movement') addSystemMessage(state, 'Movement breaks your meditation.');
    interrupted = true;
  }
  if (interrupted || force) setPlayerActionState(state, reason === 'stun' ? 'stunned' : 'idle', reason === 'stun' ? 0.9 : 0, reason);
  return interrupted;
}

export function handlePlayerDamaged(state: GameState, amount: number): void {
  if (state.spellCasting && Math.random() < Math.min(0.85, 0.2 + amount * 0.035)) {
    interruptPlayerAction(state, 'damage');
  }
  if (state.gathering && amount >= 7 && Math.random() < Math.min(0.75, 0.25 + amount * 0.03)) {
    interruptPlayerAction(state, 'damage');
  }
  if (state.bandage && amount > 0) {
    state.bandage.interrupted = true;
    state.bandage.remaining = Math.min(state.bandage.duration + 1.2, state.bandage.remaining + Math.min(1.2, amount * 0.05));
  }
  if (amount >= 14 && Math.random() < 0.18) {
    interruptPlayerAction(state, 'stun', true);
    state.ui.prompt = 'A heavy hit stuns you.';
  }
}
