import { areas } from '../data/areas';
import { itemDefs } from '../data/items';
import { skillGainsPerMinute } from '../systems/TelemetrySystem';
import { createDevScenePresets } from '../tools/devScenes';
import type { GameState, ResourceTile, TargetRef } from '../game/types';

export function DevOverlay(state: GameState): string {
  if (!state.dev.overlay) return '';
  const selectedEntity = describeTarget(state, state.ui.selectedTarget ?? (state.player.activeTargetId ? { kind: 'entity', entityId: state.player.activeTargetId } : null));
  const hoveredResource = resourceTileInspector(state);
  const activeEffects = [
    state.player.combatProfile.hidden ? 'Hidden' : '',
    state.player.combatProfile.poison ? `Poison ${Math.ceil(state.player.combatProfile.poison.remaining)}s` : '',
    state.bandage ? 'Bandage' : '',
    state.spellCasting ? `Casting ${state.spellCasting.spellId}` : '',
    ...Object.values(state.realtime.statusEffects)
      .flat()
      .filter((effect) => effect.targetId === 'player')
      .map((effect) => `${effect.type} ${Math.max(0, Math.ceil(effect.endsAt - state.clock))}s`)
  ].filter(Boolean);
  const queue = state.realtime.actionQueue.slice(0, 6);
  const telemetry = state.dev.telemetry;
  const gainsPerMin = skillGainsPerMinute(state);
  const topSkillGains = Object.entries(gainsPerMin)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const topYields = Object.entries(telemetry.resourceYields)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const topOutflow = Object.entries(telemetry.resourceOutflow)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const topSold = Object.entries(telemetry.itemsSold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const validation = state.dev.contentValidation;

  return `<section class="dev-overlay">
    <header>
      <span>Dev Tools</span>
      <b class="${validation.ok ? 'ok' : 'bad'}">${validation.ok ? 'content ok' : `${validation.errors.length} content errors`}</b>
      <button data-action="toggle-dev-overlay">x</button>
    </header>
    <div class="dev-grid">
      <div>
        <h3>Runtime</h3>
        <p><span>Area</span><b>${areas[state.player.currentArea].name}</b></p>
        <p><span>Coords</span><b>${state.player.position.x.toFixed(1)}, ${state.player.position.z.toFixed(1)}</b></p>
        <p><span>Action</span><b>${state.player.actionState.kind} ${state.player.actionState.source ? `(${state.player.actionState.source})` : ''}</b></p>
        <p><span>Reputation</span><b>${state.player.reputation.status} (${state.player.reputation.townStanding})</b></p>
        <p><span>Crime events</span><b>${state.world.crimeEvents.length}</b></p>
        <p><span>Target</span><b>${selectedEntity}</b></p>
        <p><span>Tick</span><b>${state.realtime.tick} @ ${state.realtime.tickRate}hz</b></p>
        <p><span>Entities</span><b>${state.dev.renderStats.visibleEntityCount}/${state.dev.renderStats.entityCount}</b></p>
        <p><span>Draw</span><b>${state.dev.renderStats.roughDrawCalls} calls, ${state.dev.renderStats.triangles} tris</b></p>
        <p><span>Buffs</span><b>${activeEffects.length ? activeEffects.join(', ') : 'none'}</b></p>
      </div>
      <div>
        <h3>Command Queue</h3>
        ${queue.length ? queue.map((entry) => `<p><span>${entry.actorId}</span><b>${entry.action.type}</b></p>`).join('') : '<p><span>Queue</span><b>empty</b></p>'}
        <h3>Resource Tile</h3>
        ${hoveredResource ? resourceTileHtml(hoveredResource) : '<p><span>Hover</span><b>no tile</b></p>'}
      </div>
      <div>
        <h3>Telemetry</h3>
        <p><span>Damage dealt</span><b>${sumRecord(telemetry.damageDealtBySource)}</b></p>
        <p><span>Damage taken</span><b>${telemetry.damageTaken}</b></p>
        <p><span>Gold</span><b>+${telemetry.goldEarned} / -${telemetry.goldSpent}</b></p>
        <p><span>Orders / Market</span><b>${telemetry.workOrdersCompleted} / ${telemetry.marketTransactions}</b></p>
        <p><span>Deaths</span><b>${telemetry.deathCount}</b></p>
        <p><span>Potions</span><b>${sumRecord(telemetry.potionConsumption)}</b></p>
        ${topSkillGains.length ? topSkillGains.map(([skill, value]) => `<p><span>${skill}/min</span><b>${value}</b></p>`).join('') : '<p><span>Skill/min</span><b>none</b></p>'}
        ${topYields.length ? topYields.map(([itemId, value]) => `<p><span>${itemDefs[itemId]?.name ?? itemId}</span><b>${value}</b></p>`).join('') : ''}
        ${topOutflow.length ? topOutflow.map(([itemId, value]) => `<p><span>Out ${itemDefs[itemId]?.name ?? itemId}</span><b>${value}</b></p>`).join('') : ''}
        ${topSold.length ? topSold.map(([itemId, value]) => `<p><span>Sold ${itemDefs[itemId]?.name ?? itemId}</span><b>${value}</b></p>`).join('') : ''}
        <button data-action="dev-export-telemetry">Export JSON</button>
      </div>
      <div>
        <h3>Tools</h3>
        <div class="dev-buttons">
          <button data-dev-spawn-item="iron_bar">Item</button>
          <button data-dev-spawn-enemy="Bandit">Enemy</button>
          <button data-dev-add-gold="250">Gold</button>
          <button data-dev-reset-resources="1">Reset Res</button>
          <button data-dev-complete-quest-step="1">Quest Step</button>
          <button data-dev-give-spell="fireball">Spell</button>
        </div>
        <div class="dev-scenes">
          ${createDevScenePresets().map((scene) => `<button data-dev-scene="${scene.id}" title="${scene.description}">${scene.label}</button>`).join('')}
        </div>
        <div class="dev-buttons">
          ${(['dawn', 'day', 'dusk', 'night'] as const).map((phase) => `<button data-dev-time-phase="${phase}">${phase}</button>`).join('')}
        </div>
        <div class="dev-buttons">
          <button data-dev-skill="Swordsmanship" data-value="75">Sword 75</button>
          <button data-dev-skill="Magery" data-value="75">Magery 75</button>
          <button data-dev-area="town">Town</button>
          <button data-dev-area="forest">Forest</button>
        </div>
      </div>
    </div>
    ${validation.errors.length || validation.warnings.length ? `<details>
      <summary>Content validation</summary>
      ${validation.errors.slice(0, 10).map((error) => `<p class="bad">${error}</p>`).join('')}
      ${validation.warnings.slice(0, 10).map((warning) => `<p>${warning}</p>`).join('')}
    </details>` : ''}
    ${state.dev.telemetryExportJson ? `<textarea readonly>${escapeHtml(state.dev.telemetryExportJson)}</textarea>` : ''}
  </section>`;
}

function describeTarget(state: GameState, target: TargetRef): string {
  if (!target) return 'none';
  if (target.kind === 'entity' || target.kind === 'hostile' || target.kind === 'friendly' || target.kind === 'ground-item') {
    const entity = state.entities[target.entityId];
    if (!entity) return target.entityId;
    if (entity.kind === 'enemy') return `${entity.name} ${entity.state} ${Math.round(entity.health)}/${entity.maxHealth}`;
    return `${entity.name} ${entity.kind}`;
  }
  if (target.kind === 'tile') return `${target.areaId} ${target.position.x.toFixed(1)},${target.position.z.toFixed(1)}`;
  if (target.kind === 'inventory') return `${target.owner} slot ${target.slot}`;
  return target.kind;
}

function resourceTileInspector(state: GameState): ResourceTile | null {
  const target = state.ui.hoverTarget ?? state.ui.selectedTarget;
  if (target?.kind !== 'tile') return null;
  const x = Math.round(target.position.x);
  const z = Math.round(target.position.z);
  return (
    Object.values(state.world.resourceTiles).find(
      (tile) => tile.areaId === target.areaId && Math.abs(tile.x - x) <= 1 && Math.abs(tile.z - z) <= 1
    ) ?? null
  );
}

function resourceTileHtml(tile: ResourceTile): string {
  return `<p><span>${tile.resourceKind}</span><b>${tile.name}</b></p>
    <p><span>Harvests</span><b>${tile.harvestsRemaining}/${tile.maxHarvests}</b></p>
    <p><span>Difficulty</span><b>${tile.difficulty}</b></p>
    <p><span>Yields</span><b>${tile.currentYieldTable.map((entry) => `${entry.itemId} ${Math.round(entry.chance * 100)}%`).join(', ')}</b></p>`;
}

function sumRecord(record: Record<string, number>): number {
  return Object.values(record).reduce((total, value) => total + value, 0);
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
