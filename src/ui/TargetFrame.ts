import type { GameState } from '../game/types';

export function TargetFrame(state: GameState): string {
  const target = state.player.activeTargetId ? state.entities[state.player.activeTargetId] : null;
  if (!target || target.kind !== 'enemy' || target.state === 'dead') return '';
  const pct = Math.max(0, (target.health / target.maxHealth) * 100);
  return `<section class="target-frame">
    <b>${target.name} <small>Lv. ${target.level}</small></b>
    <div class="bar hp"><i style="width:${pct}%"></i><span>${Math.ceil(target.health)}/${target.maxHealth}</span></div>
    <em>${target.enemyType}</em>
  </section>`;
}
