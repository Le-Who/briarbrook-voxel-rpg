import type { GameState, Vec3 } from '../game/types';
import { emitAudioHook } from '../audio/AudioHooks';
import { addSystemMessage } from './ChatSystem';
import { addFloatingText } from './LootSystem';
import { recordInvalidActionTelemetry } from './TelemetrySystem';

export type ActionFeedbackType =
  | 'input-ack'
  | 'target-valid'
  | 'target-invalid'
  | 'action-start'
  | 'action-progress'
  | 'action-success'
  | 'action-failure'
  | 'resource-consumed'
  | 'resource-gained'
  | 'skill-gain'
  | 'status-effect'
  | 'cooldown'
  | 'interrupted'
  | 'world-change';

export type ActionFeedbackChannel = 'cursor' | 'animation' | 'vfx' | 'ui-badge' | 'progress' | 'floating-text' | 'toast' | 'audio' | 'journal' | 'chat-log';

export interface ActionFeedbackEvent {
  type: ActionFeedbackType;
  message: string;
  hint?: string;
  detail?: string;
  position?: Vec3;
  floatText?: string;
  color?: string;
  chat?: boolean;
  channels?: ActionFeedbackChannel[];
}

export const ACTION_FEEDBACK_CHANNELS: Record<ActionFeedbackType, ActionFeedbackChannel[]> = {
  'input-ack': ['animation', 'ui-badge'],
  'target-valid': ['cursor', 'ui-badge'],
  'target-invalid': ['cursor', 'floating-text', 'toast'],
  'action-start': ['animation', 'progress', 'toast', 'audio'],
  'action-progress': ['progress', 'ui-badge'],
  'action-success': ['animation', 'vfx', 'floating-text', 'toast', 'audio'],
  'action-failure': ['animation', 'vfx', 'floating-text', 'toast', 'audio'],
  'resource-consumed': ['ui-badge', 'journal'],
  'resource-gained': ['floating-text', 'toast', 'ui-badge'],
  'skill-gain': ['toast', 'journal', 'chat-log'],
  'status-effect': ['ui-badge', 'vfx', 'toast'],
  cooldown: ['ui-badge', 'toast'],
  interrupted: ['animation', 'floating-text', 'toast'],
  'world-change': ['vfx', 'journal', 'chat-log']
};

interface FeedbackMemory {
  key: string;
  at: number;
  count: number;
}

const repeatedFeedback = new WeakMap<GameState, FeedbackMemory>();
const REPEATED_INVALID_WINDOW = 1.4;

export function pushActionFeedback(state: GameState, event: ActionFeedbackEvent): void {
  const message = event.hint ? `${event.message} ${event.hint}` : event.message;
  state.ui.prompt = message;
  if (event.floatText && event.position) addFloatingText(state, event.floatText, event.position, event.color ?? '#f6df8b');
  if (event.chat) addSystemMessage(state, event.detail ?? message);
}

export function invalidAction(state: GameState, reason: string, hint?: string, options: Pick<ActionFeedbackEvent, 'position' | 'floatText' | 'color'> = {}): void {
  const message = hint ? `${reason} ${hint}` : reason;
  state.ui.prompt = message;
  const key = `invalid:${message}`;
  const previous = repeatedFeedback.get(state);
  const repeated = previous?.key === key && state.clock - previous.at < REPEATED_INVALID_WINDOW;
  repeatedFeedback.set(state, { key, at: state.clock, count: repeated ? previous.count + 1 : 1 });
  recordInvalidActionTelemetry(state);
  if (!repeated) emitAudioHook('invalid_action', { area: state.player.currentArea, position: options.position ?? state.player.position });
  if (!repeated && options.position) addFloatingText(state, options.floatText ?? '!', options.position, options.color ?? '#ff6b5f');
}

export function actionSucceeded(state: GameState, message: string, options: Pick<ActionFeedbackEvent, 'position' | 'floatText' | 'color' | 'chat'> = {}): void {
  pushActionFeedback(state, {
    type: 'action-success',
    message,
    position: options.position,
    floatText: options.floatText,
    color: options.color ?? '#70d69a',
    chat: options.chat
  });
}

export function resourceGained(state: GameState, label: string, position: Vec3, color = '#e8f5be'): void {
  pushActionFeedback(state, {
    type: 'resource-gained',
    message: label,
    position,
    floatText: label,
    color,
    channels: ['floating-text', 'toast', 'ui-badge']
  });
}

export function actionInterrupted(state: GameState, reason: string, position: Vec3 = state.player.position): void {
  invalidAction(state, reason, undefined, { position, floatText: 'Interrupted', color: '#ffb35f' });
}
