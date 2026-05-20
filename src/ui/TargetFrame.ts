import type { GameState } from '../game/types';

export function TargetFrame(state: GameState): string {
  const target = state.player.activeTargetId ? state.entities[state.player.activeTargetId] : null;
  if (!target || target.kind !== 'enemy' || target.state === 'dead') return '';
  const pct = Math.max(0, (target.health / target.maxHealth) * 100);
  const castTelegraph = state.combat.telegraphs.find((telegraph) => telegraph.sourceId === target.id && telegraph.kind === 'cast');
  const castPct = castTelegraph ? Math.max(0, Math.min(100, 100 - (castTelegraph.remaining / castTelegraph.duration) * 100)) : 0;
  const castBar = castTelegraph ? `<div class="enemy-cast-progress"><span>Casting</span><b>${Math.round(castPct)}%</b><i style="width:${castPct}%; background:${castTelegraph.color}"></i></div>` : '';
  return `<section class="target-frame">
    <b>${target.name} <small>Lv. ${target.level}</small></b>
    <div class="bar hp"><i style="width:${pct}%"></i><span>${Math.ceil(target.health)}/${target.maxHealth}</span></div>
    ${castBar}
    <em>${target.enemyType}</em>
  </section>`;
}
