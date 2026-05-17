import { itemDefs } from '../data/items';
import type { DerivedStats, EquipmentState, GameState } from '../game/types';
import { durabilityScale } from './EconomySystem';

export function calculateDerivedStats(state: GameState): DerivedStats {
  const attrs = state.player.attributes;
  const dexterity = attrs.Dexterity ?? attrs.Agility;
  const base: DerivedStats = {
    maxHealth: 75 + attrs.Constitution * 2.5,
    maxMana: 45 + attrs.Intelligence * 2.9,
    maxStamina: 16 + dexterity * 0.55,
    minDamage: 2 + Math.floor(attrs.Strength * 0.35),
    maxDamage: 6 + Math.floor(attrs.Strength * 0.55),
    attackSpeed: Math.max(0.85, 1.85 - dexterity * 0.018),
    armor: 8 + Math.floor(attrs.Constitution * 0.35),
    magicResist: 6 + Math.floor(attrs.Intelligence * 0.75),
    critChance: 4 + Math.floor(attrs.Luck * 0.35),
    dodgeChance: 3 + Math.floor(dexterity * 0.25),
    carryCapacity: 65 + attrs.Strength * 2.1
  };

  Object.values(state.player.equipment).forEach((stack) => {
    if (!stack) return;
    const scale = durabilityScale(stack);
    const modifiers = { ...(itemDefs[stack.itemId]?.statModifiers ?? {}), ...(stack.statModifiers ?? {}) };
    for (const [key, value] of Object.entries(modifiers)) {
      if (typeof value !== 'number') continue;
      if (key in base) {
        (base as unknown as Record<string, number>)[key] += value * scale;
      }
    }
  });

  const armorId = state.player.equipment.armor?.itemId ?? '';
  if (armorId.includes('iron')) {
    base.dodgeChance -= 3;
    base.attackSpeed += 0.08;
    base.maxMana -= 3;
  } else if (armorId.includes('leather')) {
    base.dodgeChance += 2;
  } else if (armorId.includes('robe')) {
    base.magicResist += 3;
    base.maxMana += 6;
    base.armor -= 3;
  }
  if (state.player.equipment.shield) {
    base.dodgeChance -= 1;
    base.attackSpeed += 0.04;
  }

  state.spellEffects.forEach((effect) => {
    if (effect.type === 'protection') {
      base.armor += effect.amount;
      base.magicResist += Math.round(effect.amount * 0.55);
    }
    if (effect.type === 'strength') {
      base.minDamage += Math.round(effect.amount * 0.5);
      base.maxDamage += effect.amount;
      base.maxStamina += effect.amount;
      base.carryCapacity += effect.amount * 3;
    }
  });

  base.maxHealth = Math.round(base.maxHealth);
  base.maxMana = Math.round(base.maxMana);
  base.maxStamina = Math.round(base.maxStamina);
  base.minDamage = Math.round(base.minDamage);
  base.maxDamage = Math.round(base.maxDamage);
  base.armor = Math.round(base.armor);
  base.magicResist = Math.round(base.magicResist);
  base.carryCapacity = Math.round(base.carryCapacity);
  base.attackSpeed = Number(base.attackSpeed.toFixed(2));
  return base;
}

export function getEquippedItemId(equipment: EquipmentState, slot: keyof EquipmentState): string | null {
  return equipment[slot]?.itemId ?? null;
}
