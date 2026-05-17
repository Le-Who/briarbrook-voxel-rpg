import type { GameState, SkillId } from '../game/types';

function telemetry(state: GameState) {
  return state.dev.telemetry;
}

export function recordDamageDealt(state: GameState, source: string, amount: number): void {
  const value = Math.max(0, Math.round(amount));
  if (value <= 0) return;
  const data = telemetry(state);
  data.damageDealtBySource[source] = (data.damageDealtBySource[source] ?? 0) + value;
}

export function recordDamageTaken(state: GameState, amount: number): void {
  const value = Math.max(0, Math.round(amount));
  if (value <= 0) return;
  telemetry(state).damageTaken += value;
}

export function recordSkillGainTelemetry(state: GameState, skillId: SkillId, amount: number): void {
  if (amount <= 0) return;
  const data = telemetry(state);
  data.skillGains[skillId] = Number(((data.skillGains[skillId] ?? 0) + amount).toFixed(2));
}

export function recordResourceYield(state: GameState, itemId: string, amount: number): void {
  if (amount <= 0) return;
  const data = telemetry(state);
  data.resourceYields[itemId] = (data.resourceYields[itemId] ?? 0) + amount;
}

export function recordResourceOutflow(state: GameState, itemId: string, amount: number): void {
  if (amount <= 0) return;
  const data = telemetry(state);
  data.resourceOutflow[itemId] = (data.resourceOutflow[itemId] ?? 0) + amount;
}

export function recordItemSold(state: GameState, itemId: string, amount: number): void {
  if (amount <= 0) return;
  const data = telemetry(state);
  data.itemsSold[itemId] = (data.itemsSold[itemId] ?? 0) + amount;
}

export function recordItemConsumed(state: GameState, itemId: string, amount: number): void {
  if (amount <= 0) return;
  const data = telemetry(state);
  data.itemsConsumed[itemId] = (data.itemsConsumed[itemId] ?? 0) + amount;
}

export function recordWorkOrderCompleted(state: GameState): void {
  telemetry(state).workOrdersCompleted += 1;
}

export function recordMarketTransaction(state: GameState): void {
  telemetry(state).marketTransactions += 1;
}

export function recordPriceTrend(state: GameState, itemId: string, unitPrice: number): void {
  const value = Math.max(0, Math.round(unitPrice));
  const data = telemetry(state);
  const current = data.priceTrends[itemId] ?? [];
  data.priceTrends[itemId] = [...current, value].slice(-12);
}

export function recordGoldDelta(state: GameState, amount: number): void {
  if (amount > 0) telemetry(state).goldEarned += Math.round(amount);
  if (amount < 0) telemetry(state).goldSpent += Math.abs(Math.round(amount));
}

export function recordPotionConsumed(state: GameState, itemId: string): void {
  const data = telemetry(state);
  data.potionConsumption[itemId] = (data.potionConsumption[itemId] ?? 0) + 1;
  recordItemConsumed(state, itemId, 1);
}

export function recordDeath(state: GameState): void {
  telemetry(state).deathCount += 1;
}

export function recordQuestCompletionTelemetry(state: GameState, questId: string): void {
  telemetry(state).questCompletionTime[questId] = Math.max(0, Number((state.clock - telemetry(state).startedAt).toFixed(1)));
}

export function skillGainsPerMinute(state: GameState): Record<SkillId, number> {
  const elapsedMinutes = Math.max(1 / 60, (state.clock - telemetry(state).startedAt) / 60);
  return Object.fromEntries(
    Object.entries(telemetry(state).skillGains).map(([skillId, gained]) => [skillId, Number((gained / elapsedMinutes).toFixed(2))])
  );
}

export function exportTelemetryJson(state: GameState): string {
  return JSON.stringify(
    {
      clock: Number(state.clock.toFixed(2)),
      area: state.player.currentArea,
      telemetry: telemetry(state),
      skillGainsPerMinute: skillGainsPerMinute(state)
    },
    null,
    2
  );
}
