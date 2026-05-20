import { spellDefs } from '../data/spells';
import { housingTierDefinitions, reagentItemIds } from '../data/housing';
import { itemDefs } from '../data/items';
import { resourceNodeDefs } from '../data/resources';
import type { EquipmentSlot, GameState, ItemStack, RecipeRequirement, SkillId } from '../game/types';
import { calculateLocalPrice } from './EconomySystem';
import { getItemCount } from './InventorySystem';

export interface FirstHourBalanceSummary {
  elapsedMinutes: number;
  totalSkillGainPerMinute: number;
  topSkillGain: string;
  goldNet: number;
  resourceIn: number;
  resourceOut: number;
  damageDealt: number;
  damageTaken: number;
  potionUses: number;
  bandagesApplied: number;
  combatBandagesApplied: number;
  repairsCompleted: number;
  deathCount: number;
  experimentCasts: string;
  repairEstimate: string;
}

export type BalanceCheckStatus = 'pass' | 'watch' | 'fail';
export type EconomyExploitSeverity = 'info' | 'warning' | 'critical';

export interface ProgressionBalanceMetrics {
  elapsedHours: number;
  goldPerHour: number;
  resourcePerHour: number;
  skillGainPerHour: number;
  durabilityLossPerHour: number;
  reagentConsumptionPerHour: number;
  deathRatePerHour: number;
  healingConsumptionPerHour: number;
  averageWorkOrderCompletionMinutes: number | null;
  housingTierOneMaterialMinutes: number;
  averageCombatTimeToKillSeconds: number | null;
}

export interface BalanceTargetCheck {
  id: string;
  label: string;
  status: BalanceCheckStatus;
  value: string;
  target: string;
}

export interface EconomyExploitFinding {
  id: string;
  severity: EconomyExploitSeverity;
  detail: string;
}

export interface EconomyExploitAudit {
  checked: string[];
  findings: EconomyExploitFinding[];
  criticalCount: number;
  warningCount: number;
}

export interface ProgressionBalanceReport {
  metrics: ProgressionBalanceMetrics;
  targetChecks: BalanceTargetCheck[];
  antiExploit: EconomyExploitAudit;
}

export const firstHourBalanceTargets = {
  goldPerHour: { min: 60, max: 260 },
  resourcePerHour: { min: 35, max: 240 },
  skillGainPerHour: { min: 2, max: 12 },
  durabilityLossPerHour: { min: 1, max: 35 },
  reagentConsumptionPerHour: { min: 1, max: 40 },
  deathRatePerHour: { max: 2 },
  healingConsumptionPerHour: { min: 1, max: 20 },
  averageWorkOrderCompletionMinutes: { min: 5, max: 35 },
  housingTierOneMaterialMinutes: { max: 60 },
  averageCombatTimeToKillSeconds: { min: 8, max: 40 }
} as const;

const experimentSpellIds = ['magic_arrow', 'heal', 'night_sight'] as const;

export function summarizeFirstHourBalance(state: GameState): FirstHourBalanceSummary {
  const telemetry = state.dev.telemetry;
  const gains = skillGainsPerMinuteSnapshot(state);
  const topSkillGain = Object.entries(gains).sort((a, b) => b[1] - a[1])[0];
  return {
    elapsedMinutes: Number(Math.max(0, (state.clock - telemetry.startedAt) / 60).toFixed(1)),
    totalSkillGainPerMinute: Number(Object.values(gains).reduce((total, value) => total + value, 0).toFixed(2)),
    topSkillGain: topSkillGain ? `${topSkillGain[0]} ${topSkillGain[1]}/min` : 'none',
    goldNet: telemetry.goldEarned - telemetry.goldSpent,
    resourceIn: sumRecord(telemetry.resourceYields),
    resourceOut: sumRecord(telemetry.resourceOutflow),
    damageDealt: sumRecord(telemetry.damageDealtBySource),
    damageTaken: telemetry.damageTaken,
    potionUses: sumRecord(telemetry.potionConsumption),
    bandagesApplied: telemetry.bandagesApplied ?? 0,
    combatBandagesApplied: telemetry.combatBandagesApplied ?? 0,
    repairsCompleted: telemetry.repairsCompleted ?? 0,
    deathCount: telemetry.deathCount,
    experimentCasts: experimentSpellIds.map((spellId) => `${spellDefs[spellId].displayName} ${availableSpellCasts(state, spellId)}`).join(' / '),
    repairEstimate: starterRepairEstimate(state)
  };
}

export function createProgressionBalanceReport(state: GameState): ProgressionBalanceReport {
  const telemetry = state.dev.telemetry;
  const elapsedHours = Math.max(1 / 3600, (state.clock - telemetry.startedAt) / 3600);
  const metrics: ProgressionBalanceMetrics = {
    elapsedHours: Number(elapsedHours.toFixed(2)),
    goldPerHour: ratePerHour(telemetry.goldEarned - telemetry.goldSpent, elapsedHours),
    resourcePerHour: ratePerHour(sumRecord(telemetry.resourceYields), elapsedHours),
    skillGainPerHour: ratePerHour(sumRecord(telemetry.skillGains), elapsedHours),
    durabilityLossPerHour: ratePerHour(sumRecord(telemetry.durabilityLossByItem ?? {}), elapsedHours),
    reagentConsumptionPerHour: ratePerHour(sumReagentConsumption(telemetry.itemsConsumed), elapsedHours),
    deathRatePerHour: ratePerHour(telemetry.deathCount, elapsedHours),
    healingConsumptionPerHour: ratePerHour(sumRecord(telemetry.potionConsumption) + (telemetry.bandagesApplied ?? 0), elapsedHours),
    averageWorkOrderCompletionMinutes: averageMinutes(telemetry.workOrderCompletionSeconds ?? {}),
    housingTierOneMaterialMinutes: estimateHousingTierOneMaterialMinutes(state, elapsedHours),
    averageCombatTimeToKillSeconds: averageSeconds(telemetry.combatTimeToKillSeconds ?? {})
  };
  const antiExploit = auditEconomyExploits(state);
  return {
    metrics,
    targetChecks: createTargetChecks(state, metrics, antiExploit),
    antiExploit
  };
}

export function auditEconomyExploits(state: GameState): EconomyExploitAudit {
  const findings: EconomyExploitFinding[] = [];
  findings.push(...auditMarketArbitrage(state));
  findings.push(...auditVendorArbitrage(state));
  findings.push(...auditWorkOrderSpam(state));
  findings.push(...auditResourceRespawnAbuse());
  findings.push(...auditRepairLoopRisk(state));
  findings.push(...auditSaveLoadDuplicationRisk(state));
  return {
    checked: [
      'infinite_gold_loops',
      'free_repair_loops',
      'resource_respawn_abuse',
      'vendor_arbitrage',
      'work_order_spam',
      'save_load_duplication'
    ],
    findings,
    criticalCount: findings.filter((finding) => finding.severity === 'critical').length,
    warningCount: findings.filter((finding) => finding.severity === 'warning').length
  };
}

function skillGainsPerMinuteSnapshot(state: GameState): Record<SkillId, number> {
  const elapsedMinutes = Math.max(1 / 60, (state.clock - state.dev.telemetry.startedAt) / 60);
  return Object.fromEntries(
    Object.entries(state.dev.telemetry.skillGains).map(([skillId, amount]) => [skillId, Number((amount / elapsedMinutes).toFixed(2))])
  );
}

function createTargetChecks(state: GameState, metrics: ProgressionBalanceMetrics, antiExploit: EconomyExploitAudit): BalanceTargetCheck[] {
  const experimentCastCount = experimentSpellIds.reduce((total, spellId) => total + availableSpellCasts(state, spellId), 0);
  return [
    rangeCheck('visible_skill_gains', 'Visible skill gains', metrics.skillGainPerHour, firstHourBalanceTargets.skillGainPerHour, 'skill/hr'),
    rangeCheck('gold_experimentation', 'Gold to experiment', metrics.goldPerHour, firstHourBalanceTargets.goldPerHour, 'gold/hr'),
    rangeCheck('gathering_pace', 'Gathering pace', metrics.resourcePerHour, firstHourBalanceTargets.resourcePerHour, 'resources/hr'),
    rangeCheck('repair_pressure', 'Repair pressure', metrics.durabilityLossPerHour, firstHourBalanceTargets.durabilityLossPerHour, 'durability/hr'),
    {
      id: 'magic_experimentation',
      label: 'Magic use without starvation',
      status: experimentCastCount >= 3 && metrics.reagentConsumptionPerHour <= firstHourBalanceTargets.reagentConsumptionPerHour.max ? 'pass' : metrics.reagentConsumptionPerHour > firstHourBalanceTargets.reagentConsumptionPerHour.max ? 'fail' : 'watch',
      value: `${experimentCastCount} starter casts, ${metrics.reagentConsumptionPerHour}/hr`,
      target: `>=3 starter casts and <=${firstHourBalanceTargets.reagentConsumptionPerHour.max}/hr reagent burn`
    },
    {
      id: 'combat_risk_teaching',
      label: 'Combat teaches risk',
      status: metrics.deathRatePerHour <= firstHourBalanceTargets.deathRatePerHour.max && state.dev.telemetry.damageTaken > 0 ? 'pass' : metrics.deathRatePerHour > firstHourBalanceTargets.deathRatePerHour.max ? 'fail' : 'watch',
      value: `${metrics.deathRatePerHour}/hr deaths, ${state.dev.telemetry.damageTaken} damage taken`,
      target: `<=${firstHourBalanceTargets.deathRatePerHour.max}/hr deaths with visible damage`
    },
    nullableRangeCheck('work_order_pace', 'Work order completion', metrics.averageWorkOrderCompletionMinutes, firstHourBalanceTargets.averageWorkOrderCompletionMinutes, 'min'),
    nullableRangeCheck('combat_time_to_kill', 'Combat time-to-kill', metrics.averageCombatTimeToKillSeconds, firstHourBalanceTargets.averageCombatTimeToKillSeconds, 'sec'),
    {
      id: 'housing_tier_1_reachable',
      label: 'Housing Tier 0/1 reachable',
      status: metrics.housingTierOneMaterialMinutes <= firstHourBalanceTargets.housingTierOneMaterialMinutes.max ? 'pass' : 'fail',
      value: `${metrics.housingTierOneMaterialMinutes} min`,
      target: `<=${firstHourBalanceTargets.housingTierOneMaterialMinutes.max} min`
    },
    {
      id: 'no_critical_exploits',
      label: 'No critical economy exploit',
      status: antiExploit.criticalCount === 0 ? 'pass' : 'fail',
      value: `${antiExploit.criticalCount} critical`,
      target: '0 critical'
    }
  ];
}

function rangeCheck(id: string, label: string, value: number, target: { min?: number; max?: number }, unit: string): BalanceTargetCheck {
  const below = target.min != null && value < target.min;
  const above = target.max != null && value > target.max;
  return {
    id,
    label,
    status: below || above ? 'fail' : 'pass',
    value: `${value} ${unit}`,
    target: `${target.min ?? 0}-${target.max ?? 'open'} ${unit}`
  };
}

function nullableRangeCheck(id: string, label: string, value: number | null, target: { min?: number; max?: number }, unit: string): BalanceTargetCheck {
  if (value == null) {
    return { id, label, status: 'watch', value: 'no sample', target: `${target.min ?? 0}-${target.max ?? 'open'} ${unit}` };
  }
  return rangeCheck(id, label, value, target, unit);
}

function availableSpellCasts(state: GameState, spellId: (typeof experimentSpellIds)[number]): number {
  const spell = spellDefs[spellId];
  const reagentLimit = minRequirementCount(state, spell.reagents);
  const manaLimit = spell.manaCost > 0 ? Math.floor(state.player.mana / spell.manaCost) : 99;
  return Math.max(0, Math.min(reagentLimit, manaLimit));
}

function minRequirementCount(state: GameState, requirements: RecipeRequirement[]): number {
  if (!requirements.length) return 99;
  return Math.min(...requirements.map((requirement) => Math.floor(getItemCount(state.player.inventory, requirement.itemId) / requirement.quantity)));
}

function ratePerHour(value: number, elapsedHours: number): number {
  return Number((value / Math.max(1 / 3600, elapsedHours)).toFixed(1));
}

function averageSeconds(record: Record<string, number>): number | null {
  const values = Object.values(record).filter((value) => Number.isFinite(value));
  if (!values.length) return null;
  return Number((values.reduce((total, value) => total + value, 0) / values.length).toFixed(1));
}

function averageMinutes(record: Record<string, number>): number | null {
  const average = averageSeconds(record);
  return average == null ? null : Number((average / 60).toFixed(1));
}

function sumReagentConsumption(consumed: Record<string, number>): number {
  return reagentItemIds.reduce((total, itemId) => total + (consumed[itemId] ?? 0), 0);
}

function estimateHousingTierOneMaterialMinutes(state: GameState, elapsedHours: number): number {
  const tier = housingTierDefinitions.find((candidate) => candidate.tier === 1);
  if (!tier) return 0;
  const missingItems = tier.requirements.items.reduce((total, requirement) => {
    const available = getItemCount(state.player.inventory, requirement.itemId) + getItemCount(state.player.bank, requirement.itemId);
    return total + Math.max(0, requirement.quantity - available);
  }, 0);
  const missingGold = Math.max(0, tier.requirements.gold - state.player.gold - state.player.bankGold);
  const measuredResourcePerMinute = sumRecord(state.dev.telemetry.resourceYields) / Math.max(1 / 60, elapsedHours * 60);
  const fallbackResourcePerMinute = starterHousingResourcePerMinute();
  const resourceMinutes = missingItems / Math.max(0.1, measuredResourcePerMinute || fallbackResourcePerMinute);
  const measuredGoldPerMinute = Math.max(0, (state.dev.telemetry.goldEarned - state.dev.telemetry.goldSpent) / Math.max(1 / 60, elapsedHours * 60));
  const fallbackGoldPerMinute = firstHourBalanceTargets.goldPerHour.min / 60;
  const goldMinutes = missingGold / Math.max(0.1, measuredGoldPerMinute || fallbackGoldPerMinute);
  const questMinutes = tier.requirements.completedQuestId && !state.player.completedQuestIds.includes(tier.requirements.completedQuestId) ? 20 : 0;
  return Number(Math.max(resourceMinutes, goldMinutes, questMinutes).toFixed(1));
}

function starterHousingResourcePerMinute(): number {
  const starterNodes = ['birch_tree', 'oak_tree', 'copper_vein', 'iron_vein'];
  const rates = starterNodes.map((id) => {
    const node = resourceNodeDefs[id];
    if (!node) return 0;
    const averageYield = (node.yieldRange[0] + node.yieldRange[1]) / 2;
    return averageYield / Math.max(1, node.baseDuration + 1.5);
  });
  return Math.max(1, Number((rates.reduce((total, rate) => total + rate, 0) / Math.max(1, rates.length)).toFixed(2)));
}

function auditMarketArbitrage(state: GameState): EconomyExploitFinding[] {
  const findings: EconomyExploitFinding[] = [];
  const openOrders = state.world.economy.marketOrders.filter((order) => order.status === 'open');
  const itemIds = Array.from(new Set(openOrders.map((order) => order.itemId)));
  itemIds.forEach((itemId) => {
    const buy = openOrders.filter((order) => order.itemId === itemId && order.kind === 'buy').sort((a, b) => b.unitPrice - a.unitPrice)[0];
    const sell = openOrders.filter((order) => order.itemId === itemId && order.kind === 'sell').sort((a, b) => a.unitPrice - b.unitPrice)[0];
    if (!buy || !sell) return;
    if (buy.unitPrice > sell.unitPrice) {
      findings.push({
        id: 'market_arbitrage',
        severity: 'critical',
        detail: `${itemId} can be bought for ${sell.unitPrice}g and sold into an open buy order for ${buy.unitPrice}g.`
      });
    }
  });
  return findings;
}

function auditVendorArbitrage(state: GameState): EconomyExploitFinding[] {
  const findings: EconomyExploitFinding[] = [];
  Object.values(state.entities).forEach((entity) => {
    if ((entity.kind !== 'npc' && entity.kind !== 'social') || !entity.tradeInventory) return;
    entity.tradeInventory.slots.forEach((stack) => {
      if (!stack) return;
      const buyPrice = calculateLocalPrice(state, stack.itemId, { quantity: stack.quantity, stack, mode: 'vendor_buy', vendorId: entity.id });
      const sellPrice = calculateLocalPrice(state, stack.itemId, { quantity: stack.quantity, stack, mode: 'vendor_sell', vendorId: entity.id });
      if (sellPrice > buyPrice) {
        findings.push({
          id: 'vendor_arbitrage',
          severity: 'critical',
          detail: `${entity.name} ${stack.itemId} buy ${buyPrice}g / sell ${sellPrice}g creates a vendor loop.`
        });
      }
    });
  });
  return findings;
}

function auditWorkOrderSpam(state: GameState): EconomyExploitFinding[] {
  return state.world.economy.workOrders.flatMap((order) => {
    const requiredItems = order.requiredItems?.length ? order.requiredItems : [{ itemId: order.itemId, quantity: order.quantity }];
    const requiredValue = requiredItems.reduce((total, req) => total + (itemDefs[req.itemId]?.value ?? 1) * req.quantity, 0);
    const rewardItemValue = [...(order.rewardItems ?? []), ...(order.rewardVoucherItems ?? [])].reduce((total, reward) => total + (itemDefs[reward.itemId]?.value ?? 1) * reward.quantity, 0);
    const rewardValue = order.rewardGold + rewardItemValue;
    if (order.repeatPolicy === 'daily' && rewardValue > requiredValue * 5 + 180) {
      return [{
        id: 'work_order_spam',
        severity: 'warning' as const,
        detail: `${order.id} pays about ${rewardValue}g value for ${requiredValue}g inputs.`
      }];
    }
    return [];
  });
}

function auditResourceRespawnAbuse(): EconomyExploitFinding[] {
  const findings: EconomyExploitFinding[] = [];
  Object.values(resourceNodeDefs).forEach((node) => {
    if (node.respawnSeconds < 12) {
      findings.push({ id: 'resource_respawn_abuse', severity: 'critical', detail: `${node.id} respawns in ${node.respawnSeconds}s.` });
      return;
    }
    if (node.respawnSeconds < 18) {
      findings.push({ id: 'resource_respawn_abuse', severity: 'warning', detail: `${node.id} respawns quickly at ${node.respawnSeconds}s; monitor resource/hour.` });
    }
  });
  return findings;
}

function auditRepairLoopRisk(state: GameState): EconomyExploitFinding[] {
  const repairable = Object.values(state.player.equipment).filter((stack): stack is ItemStack => Boolean(stack?.maxDurability));
  const zeroValueRepairable = repairable.find((stack) => (itemDefs[repairMaterialFor(stack)]?.value ?? 0) <= 0);
  if (!zeroValueRepairable) return [];
  return [{
    id: 'free_repair_loop',
    severity: 'critical',
    detail: `${zeroValueRepairable.itemId} repairs with zero-value ${repairMaterialFor(zeroValueRepairable)}.`
  }];
}

function auditSaveLoadDuplicationRisk(state: GameState): EconomyExploitFinding[] {
  const completedOrderIds = new Set<string>();
  for (const order of state.world.economy.workOrders) {
    if (order.status !== 'complete') continue;
    if (completedOrderIds.has(order.id)) {
      return [{ id: 'save_load_duplication', severity: 'critical', detail: `${order.id} appears completed more than once in runtime economy state.` }];
    }
    completedOrderIds.add(order.id);
  }
  return [];
}

function starterRepairEstimate(state: GameState): string {
  const slot: EquipmentSlot = state.player.equipment.weapon?.maxDurability ? 'weapon' : state.player.equipment.armor?.maxDurability ? 'armor' : 'shield';
  const stack = state.player.equipment[slot];
  if (!stack?.maxDurability) return 'none';
  const material = repairMaterialFor(stack);
  const skill = state.player.skills[repairSkillFor(stack)]?.value ?? 0;
  const baseCost = 2;
  const materialCost = Math.max(1, Math.ceil(baseCost * (1 - Math.min(80, skill) / 260)));
  return `${material} x${materialCost} @50%`;
}

function repairMaterialFor(stack: ItemStack): string {
  const material = stack.materialType ?? '';
  if (material.includes('wood') || stack.itemId.includes('bow')) return 'boards';
  if (material.includes('leather') || material.includes('cloth') || stack.itemId.includes('robe') || stack.itemId.includes('leather')) {
    return material.includes('cloth') ? 'clean_cloth' : 'leather';
  }
  return 'iron_bar';
}

function repairSkillFor(stack: ItemStack): SkillId {
  const material = stack.materialType ?? '';
  if (material.includes('wood') || stack.itemId.includes('bow')) return 'Carpentry';
  if (material.includes('leather') || material.includes('cloth') || stack.itemId.includes('robe') || stack.itemId.includes('leather')) return 'Tailoring';
  return 'Blacksmithing';
}

function sumRecord(record: Record<string, number>): number {
  return Object.values(record).reduce((total, value) => total + value, 0);
}
