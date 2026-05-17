import type { GameState } from '../game/types';
import { calculateDerivedStats } from '../systems/EquipmentSystem';
import { calculateWeight } from '../systems/InventorySystem';
import { renderIcon } from '../render/IconRenderer';
import { itemDefs } from '../data/items';

export function CharacterPanel(state: GameState): string {
  if (!state.ui.panels.character) return '';
  const stats = calculateDerivedStats(state);
  const attrs = state.player.attributes;
  const equipment = state.player.equipment;
  const slot = (name: keyof typeof equipment) => {
    const stack = equipment[name];
    const def = stack ? itemDefs[stack.itemId] : null;
    return `<div class="equip-slot">${def ? renderIcon(def.icon, def.name) : ''}</div>`;
  };
  return `<section class="panel character-panel">
    <header><span>Character</span><button data-action="toggle-panel" data-panel="character">x</button></header>
    <div class="character-body">
      <div class="paperdoll">
        ${slot('helmet')}${slot('armor')}${slot('weapon')}${slot('boots')}${slot('accessory')}
        <div class="voxel-portrait large"></div>
      </div>
      <div class="attr-list">
        ${Object.entries(attrs).map(([name, value]) => `<div><span>${name}</span><b>${value}</b></div>`).join('')}
      </div>
    </div>
    <div class="stat-list">
      <div><span>Health</span><b>${Math.round(state.player.health)}/${stats.maxHealth}</b></div>
      <div><span>Mana</span><b>${Math.round(state.player.mana)}/${stats.maxMana}</b></div>
      <div><span>Stamina</span><b>${Math.round(state.player.stamina)}/${stats.maxStamina}</b></div>
      <div><span>Damage</span><b>${stats.minDamage} - ${stats.maxDamage}</b></div>
      <div><span>Attack Speed</span><b>${stats.attackSpeed}s</b></div>
      <div><span>Armor</span><b>${stats.armor}</b></div>
      <div><span>Magic Resist</span><b>${stats.magicResist}</b></div>
      <div><span>Crit Chance</span><b>${stats.critChance}%</b></div>
      <div><span>Dodge Chance</span><b>${stats.dodgeChance}%</b></div>
      <div><span>Weight</span><b>${calculateWeight(state).toFixed(0)}/${stats.carryCapacity.toFixed(0)}</b></div>
    </div>
  </section>`;
}
