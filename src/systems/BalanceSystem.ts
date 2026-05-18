import { spellDefs } from '../data/spells';
import type { EquipmentSlot, GameState, ItemStack, RecipeRequirement, SkillId } from '../game/types';
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

function skillGainsPerMinuteSnapshot(state: GameState): Record<SkillId, number> {
  const elapsedMinutes = Math.max(1 / 60, (state.clock - state.dev.telemetry.startedAt) / 60);
  return Object.fromEntries(
    Object.entries(state.dev.telemetry.skillGains).map(([skillId, amount]) => [skillId, Number((amount / elapsedMinutes).toFixed(2))])
  );
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
