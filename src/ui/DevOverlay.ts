import { areas } from '../data/areas';
import { itemDefs } from '../data/items';
import { summarizeFirstHourBalance } from '../systems/BalanceSystem';
import { skillGainsPerMinute } from '../systems/TelemetrySystem';
import { createDevScenePresets } from '../tools/devScenes';
import type { GameState, ResourceTile, TargetRef } from '../game/types';

export function DevOverlay(state: GameState): string {
  if (!state.dev.overlay) return '';
  const selectedEntity = describeTarget(state, state.ui.selectedTarget ?? (state.player.activeTargetId ? { kind: 'entity', entityId: state.player.activeTargetId } : null));
  const selectedTarget = state.ui.selectedTarget ?? (state.player.activeTargetId ? { kind: 'entity', entityId: state.player.activeTargetId } : null);
  const facing = state.player.facing;
  const targetId = targetIdentifier(selectedTarget);
  const targetArea = describeTargetArea(state, selectedTarget);
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
  const balance = summarizeFirstHourBalance(state);
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
  const topCancellations = Object.entries(telemetry.actionCancellations ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const topSkillEvents = Object.entries(telemetry.skillEvents ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const validation = state.dev.contentValidation;
  const perf = state.dev.renderStats.perf;
  const loop = state.dev.renderStats.loop;
  const topWindowRenders = Object.entries(perf.windowRenderPerSecond)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const dirtyFlags = Object.entries(perf.dirty)
    .filter(([, active]) => active)
    .map(([key]) => key.replace(/[A-Z]/g, (char) => ` ${char.toLowerCase()}`));
  const loopDirtyFlags = Object.entries(loop.dirtyFlags)
    .filter(([, active]) => active)
    .map(([key]) => key.replace(/[A-Z]/g, (char) => ` ${char.toLowerCase()}`));

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
        <p><span>Facing</span><b>${facing ? `${facing.lastFacingSource} ${radToDeg(facing.facingYaw)}->${radToDeg(facing.desiredFacingYaw)}` : 'none'}</b></p>
        <p><span>Target ID</span><b>${targetId}</b></p>
        <p><span>Target area</span><b>${targetArea}</b></p>
        <p><span>Path</span><b>${state.player.movement.path.length}${state.player.movement.waypoint ? ' + waypoint' : ''}</b></p>
        <p><span>Last move</span><b>${state.dev.stability.lastMovementCommandSource} @ ${state.dev.stability.lastMovementCommandAt.toFixed(2)}</b></p>
        <p><span>Cancel</span><b>${state.dev.stability.lastActionCancellationReason}</b></p>
        <p><span>Portal</span><b>${state.dev.stability.currentPortalId ?? 'none'}</b></p>
        <p><span>Transition</span><b>${describeTransition(state)}</b></p>
        <p><span>Spawn fallbacks</span><b>${state.dev.stability.safeSpawnFallbackCount}</b></p>
        <p><span>Reputation</span><b>${state.player.reputation.status} (${state.player.reputation.townStanding})</b></p>
        <p><span>Crime events</span><b>${state.world.crimeEvents.length}</b></p>
        <p><span>Target</span><b>${selectedEntity}</b></p>
        <p><span>Tick</span><b>${state.realtime.tick} @ ${state.realtime.tickRate}hz</b></p>
        <p><span>FPS</span><b>${state.dev.renderStats.fps}</b></p>
        <p><span>Frame time</span><b>${state.dev.renderStats.frameTimeMs}/${state.dev.renderStats.budget.estimatedFrameMs}ms</b></p>
        <p><span>Entities</span><b>${state.dev.renderStats.visibleEntityCount}/${state.dev.renderStats.entityCount}</b></p>
        <p><span>Draw</span><b>${state.dev.renderStats.roughDrawCalls} calls, ${state.dev.renderStats.triangles} tris</b></p>
        <p><span>Meshes</span><b>${state.dev.renderStats.meshCount} (${state.dev.renderStats.staticMeshCount}/${state.dev.renderStats.entityMeshCount}/${state.dev.renderStats.effectMeshCount})</b></p>
        <p><span>Instancing</span><b>${state.dev.renderStats.instancedMeshCount} meshes, ${state.dev.renderStats.instancedInstanceCount} instances</b></p>
        <p><span>Materials</span><b>${state.dev.renderStats.materialCount} mats, ${state.dev.renderStats.geometryCount} geos</b></p>
        <p><span>Raycast</span><b>${state.dev.renderStats.raycastCandidateCount}/${state.dev.renderStats.budget.raycastCandidateCount} candidates</b></p>
        <p><span>Frame est.</span><b>${state.dev.renderStats.estimatedFrameMs}/${state.dev.renderStats.budget.estimatedFrameMs}ms</b></p>
        <p><span>Heap</span><b>${state.dev.renderStats.memoryAfterTransitionMb == null ? 'n/a' : `${state.dev.renderStats.memoryAfterTransitionMb}/${state.dev.renderStats.budget.memoryAfterTransitionMb} MB`}</b></p>
        <p><span>UI DOM</span><b>${state.dev.renderStats.domNodeCount}/${state.dev.renderStats.budget.domNodeCount} nodes</b></p>
        <p><span>Windows</span><b>${state.dev.renderStats.visibleWindowCount}/${state.dev.renderStats.budget.visibleWindowCount}</b></p>
        <p><span>Icons</span><b>${state.dev.renderStats.cachedIconCount}/${state.dev.renderStats.budget.cachedIconCount} cached · ${state.dev.renderStats.iconRenderRequestCount} renders</b></p>
        <p><span>Listeners</span><b>${state.dev.renderStats.eventListenerCount}/${state.dev.renderStats.budget.eventListenerCount}</b></p>
        <h3>Perf Counters</h3>
        <p><span>Sample</span><b>${perf.sampleWindowMs}ms · ${perf.avgFrameMs}/${perf.worstFrameMs}ms avg/worst</b></p>
        <p><span>Long frames</span><b>${perf.longFramesPerSecond}/s</b></p>
        <p><span>Subsystem avg</span><b>sim ${perf.subsystem.simulation.avgMs}ms · render ${perf.subsystem.renderer.avgMs}ms · UI ${perf.subsystem.ui.avgMs}ms</b></p>
        <p><span>Subsystem calls</span><b>sim ${perf.subsystem.simulation.callsPerSecond}/s · UI ${perf.subsystem.ui.callsPerSecond}/s</b></p>
        <p><span>UI renders</span><b>${perf.counters.uiRenderPerSecond}/s · HUD ${perf.counters.hudReplacementPerSecond}/s · queued ${perf.counters.hudQueuedPerSecond}/s</b></p>
        <p><span>Labels / minimap</span><b>${perf.counters.labelWritePerSecond}/s · ${perf.counters.minimapUpdatePerSecond}/s</b></p>
        <p><span>Tooltips</span><b>${perf.counters.tooltipSyncPerSecond}/s synced</b></p>
        <p><span>Tooltip mount</span><b>${perf.tooltip.mountCount} mounted · ${perf.tooltip.unmountCount} unmounted</b></p>
        <p><span>Tooltip updates</span><b>${perf.tooltip.contentUpdateCount} content · ${perf.tooltip.positionUpdateCount} position</b></p>
        <p><span>Tooltip anchor</span><b>${escapeHtml(perf.tooltip.currentAnchorId ?? 'none')}</b></p>
        <p><span>Tooltip reasons</span><b>${escapeHtml(perf.tooltip.lastShowReason)} / ${escapeHtml(perf.tooltip.lastHideReason)}</b></p>
        <p><span>Ray/path</span><b>${perf.counters.raycastPerSecond}/s · ${perf.counters.pathfindingPerSecond}/s</b></p>
        <p><span>Timers</span><b>${perf.counters.activeTimers} active · ${perf.counters.activeIntervals} intervals</b></p>
        <p><span>Dirty</span><b>${dirtyFlags.length ? dirtyFlags.join(', ') : 'none'}</b></p>
        ${topWindowRenders.length ? topWindowRenders.map(([id, count]) => `<p><span>${escapeHtml(id)}</span><b>${count}/s renders</b></p>`).join('') : '<p><span>Window renders</span><b>none sampled</b></p>'}
        <h3>Loop Governor</h3>
        <p><span>Activity mode</span><b>${loop.activityMode}</b></p>
        <p><span>Cadence</span><b>sim ${loop.cadence.simulationHz}hz · render ${loop.cadence.renderHz}hz · UI ${loop.cadence.uiHz}hz · map ${loop.cadence.minimapHz}hz</b></p>
        <p><span>Raycast / anim</span><b>${loop.cadence.raycastHz}hz · ${loop.cadence.animationPolicy}</b></p>
        <p><span>Loop reason</span><b>${escapeHtml(loop.lastReason)}</b></p>
        <p><span>Loop dirty</span><b>${loopDirtyFlags.length ? loopDirtyFlags.join(', ') : 'none'}</b></p>
        <p><span>Input mode</span><b>${state.dev.input.mode}</b></p>
        <p><span>Last raw</span><b>${state.dev.input.lastRawInput}</b></p>
        <p><span>Last intent</span><b>${state.dev.input.lastIntent}</b></p>
        <p><span>Focused window</span><b>${state.dev.input.focusedWindow}</b></p>
        <p><span>Focused element</span><b>${state.dev.input.focusedElement}</b></p>
        <p><span>Top window</span><b>${state.dev.input.topmostWindow}</b></p>
        <p><span>Drag payload</span><b>${state.dev.input.dragPayload ?? 'none'}</b></p>
        <p><span>Pointer capture</span><b>${state.dev.input.pointerCapture ?? 'none'}</b></p>
        <p><span>Prevented default</span><b>${state.dev.input.lastPreventedDefault}</b></p>
        <p><span>Target mode</span><b>${state.dev.input.targetMode ?? 'none'}</b></p>
        <p><span>Viewport / scale</span><b>${state.dev.input.viewport} @ ${Math.round(state.dev.input.uiScale * 100)}%</b></p>
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
        <h3>First Hour Balance</h3>
        <p><span>Elapsed</span><b>${balance.elapsedMinutes}m</b></p>
        <p><span>Skill/min</span><b>${balance.totalSkillGainPerMinute} total (${balance.topSkillGain})</b></p>
        <p><span>Gold net</span><b>${balance.goldNet >= 0 ? '+' : ''}${balance.goldNet}</b></p>
        <p><span>Resources</span><b>+${balance.resourceIn} / -${balance.resourceOut}</b></p>
        <p><span>Damage</span><b>${balance.damageDealt} dealt / ${balance.damageTaken} taken</b></p>
        <p><span>Bandages</span><b>${balance.bandagesApplied} total / ${balance.combatBandagesApplied} combat</b></p>
        <p><span>Repairs</span><b>${balance.repairsCompleted} done / ${balance.repairEstimate}</b></p>
        <p><span>Experiment casts</span><b>${balance.experimentCasts}</b></p>
        <h3>Friction</h3>
        <p><span>First-hour path</span><b>${telemetry.firstHourPathCompletionTime == null ? 'open' : `${telemetry.firstHourPathCompletionTime}s`}</b></p>
        <p><span>Transition fallbacks</span><b>${telemetry.transitionFallbacks ?? 0}</b></p>
        <p><span>Stuck recoveries</span><b>${telemetry.stuckRecoveryEvents ?? 0}</b></p>
        <p><span>Tooltip remounts</span><b>${telemetry.tooltipRemounts ?? 0}</b></p>
        <p><span>Playtest first move</span><b>${telemetry.playtest.timeToFirstMovement ?? 'open'}</b></p>
        <p><span>First interaction</span><b>${telemetry.playtest.timeToFirstSuccessfulInteraction ?? 'open'}</b></p>
        <p><span>Equip ID surface</span><b>${telemetry.playtest.timeToIdentifyEquippedItem ?? 'open'}</b></p>
        <p><span>Hotbar assign</span><b>${telemetry.playtest.timeToAssignHotbar ?? 'open'}</b></p>
        <p><span>Invalid actions</span><b>${telemetry.playtest.invalidActionCount}</b></p>
        <p><span>Tooltip reliance</span><b>${telemetry.playtest.tooltipRelianceCount}</b></p>
        <p><span>Windows opened</span><b>${sumRecord(telemetry.playtest.windowsOpened)}</b></p>
        <p><span>UI resets</span><b>${telemetry.uiResetUsage ?? 0}</b></p>
        ${topCancellations.map(([reason, count]) => `<p><span>${reason}</span><b>${count}</b></p>`).join('')}
        ${topSkillEvents.map(([skill, count]) => `<p><span>${skill} events</span><b>${count}</b></p>`).join('')}
        <button data-action="dev-export-telemetry">Export JSON</button>
      </div>
      <div>
        <h3>Tools</h3>
        <div class="dev-buttons">
          <button data-action="reset-game">Reset</button>
          <button data-action="save-game">Save</button>
          <button data-dev-stability-kit="1">Gate Kit</button>
          <button data-dev-open-panels="1">Open Panels</button>
          <button data-dev-spawn-item="iron_bar">Item</button>
          <button data-dev-spawn-enemy="Bandit">Enemy</button>
          <button data-dev-add-gold="250">Gold</button>
          <button data-dev-reset-resources="1">Reset Res</button>
          <button data-dev-complete-quest-step="1">Quest Step</button>
          <button data-dev-give-spell="fireball">Spell</button>
        </div>
        <div class="dev-scenes">
          ${createDevScenePresets().map((scene) => `<button data-dev-scene="${scene.id}" data-tooltip-id="dev-scene:${escapeAttr(scene.id)}" data-tooltip-source="dev" data-tooltip="${escapeAttr(scene.description)}">${scene.label}</button>`).join('')}
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
        <div class="dev-buttons">
          ${facingDebugButton(state, 'showFacingArrows', 'Facing')}
          ${facingDebugButton(state, 'showDesiredFacingArrows', 'Desired')}
          ${facingDebugButton(state, 'showVelocityVectors', 'Velocity')}
          ${facingDebugButton(state, 'showLookAtLines', 'LookAt')}
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

function targetIdentifier(target: TargetRef): string {
  if (!target) return 'none';
  if (target.kind === 'entity' || target.kind === 'hostile' || target.kind === 'friendly' || target.kind === 'ground-item') return target.entityId;
  if (target.kind === 'tile') return `${target.areaId}:${Math.round(target.position.x)},${Math.round(target.position.z)}`;
  if (target.kind === 'inventory') return `${target.owner}:${target.slot}`;
  return target.kind;
}

function describeTargetArea(state: GameState, target: TargetRef): string {
  if (!target) return 'none';
  if (target.kind === 'tile') return target.areaId;
  if (target.kind === 'entity' || target.kind === 'hostile' || target.kind === 'friendly' || target.kind === 'ground-item') {
    return state.entities[target.entityId]?.area ?? 'missing';
  }
  return 'global';
}

function describeTransition(state: GameState): string {
  const transition = state.dev.stability.lastTransition;
  if (!transition) return 'none';
  const fallback = transition.usedFallback ? ` fallback ${transition.resolved.x},${transition.resolved.z}` : `${transition.resolved.x},${transition.resolved.z}`;
  return `${transition.from}->${transition.to} ${fallback}`;
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

function facingDebugButton(state: GameState, key: keyof GameState['dev']['facingDebug'], label: string): string {
  return `<button data-dev-facing-debug="${key}">${state.dev.facingDebug[key] ? `${label} On` : label}</button>`;
}

function radToDeg(value: number): string {
  return `${Math.round((value * 180) / Math.PI)}deg`;
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
