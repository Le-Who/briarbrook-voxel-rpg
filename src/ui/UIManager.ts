import { buildPieces } from '../data/items';
import { spellDefs } from '../data/spells';
import type { GameAction } from '../game/Actions';
import type { EquipmentSlot, GameState, HotbarBinding, Vec3 } from '../game/types';
import type { VoxelRenderer } from '../render/VoxelRenderer';
import { calculateDerivedStats } from '../systems/EquipmentSystem';
import { calculateWeight } from '../systems/InventorySystem';
import { inspectTargetForTool } from '../systems/ResourceSystem';
import { BankPanel } from './BankPanel';
import { BuildPanel } from './BuildPanel';
import { CharacterPanel } from './CharacterPanel';
import { CombatActionsPanel } from './CombatActionsPanel';
import { ChatPanel } from './ChatPanel';
import { CraftingPanel } from './CraftingPanel';
import { DevOverlay } from './DevOverlay';
import { GuidePanel } from './GuidePanel';
import { Hotbar } from './Hotbar';
import { HelpPanel } from './HelpPanel';
import { InventoryPanel } from './InventoryPanel';
import { JournalPanel } from './JournalPanel';
import { MarketBoardPanel } from './MarketBoardPanel';
import { MerchantPanel } from './MerchantPanel';
import { Minimap } from './Minimap';
import { QuestTracker } from './QuestTracker';
import { SkillsPanel } from './SkillsPanel';
import { SpellbookPanel } from './SpellbookPanel';
import { TargetFrame } from './TargetFrame';
import { TreasureMapPanel } from './TreasureMapPanel';
import { TradePanel } from './TradePanel';

type Dispatch = (action: GameAction) => void;

export class UIManager {
  private hud: HTMLDivElement;
  private labels: HTMLDivElement;
  private lastHud = '';
  private currentState: GameState | null = null;
  private uiPointerDown = false;
  private pendingHud: string | null = null;

  constructor(private root: HTMLDivElement, private dispatch: Dispatch) {
    this.root.innerHTML = '<div class="hud-layer"></div><div class="label-layer"></div>';
    this.hud = this.root.querySelector('.hud-layer') as HTMLDivElement;
    this.labels = this.root.querySelector('.label-layer') as HTMLDivElement;
    this.bindEvents();
  }

  render(state: GameState, renderer: VoxelRenderer): void {
    this.currentState = state;
    this.root.style.setProperty('--ui-scale', String(state.ui.uiScale ?? 1));
    this.root.classList.toggle('reduced-motion', Boolean(state.ui.reducedMotion));
    const hudHtml = this.renderHud(state);
    const active = document.activeElement;
    const typing = active instanceof HTMLInputElement && active.name === 'chat';
    if (!typing && hudHtml !== this.lastHud) {
      if (this.uiPointerDown) {
        this.pendingHud = hudHtml;
      } else {
        this.replaceHud(hudHtml);
      }
    }
    this.labels.innerHTML = this.renderLabels(state, renderer);
  }

  private replaceHud(html: string): void {
    this.hud.innerHTML = html;
    this.lastHud = html;
    this.pendingHud = null;
  }

  private renderHud(state: GameState): string {
    return `${this.playerStatus(state)}
      ${TargetFrame(state)}
      ${Minimap(state)}
      ${HelpPanel(state)}
      ${CombatActionsPanel(state)}
      ${InventoryPanel(state)}
      ${JournalPanel(state)}
      ${MarketBoardPanel(state)}
      ${TreasureMapPanel(state)}
      ${this.statusPanel(state)}
      ${QuestTracker(state)}
      ${GuidePanel(state)}
      ${CharacterPanel(state)}
      ${SkillsPanel(state)}
      ${SpellbookPanel(state)}
      ${BankPanel(state)}
      ${TradePanel(state)}
      ${MerchantPanel(state)}
      ${CraftingPanel(state)}
      ${BuildPanel(state)}
      ${ChatPanel(state)}
      ${Hotbar(state)}
      ${this.actionProgress(state)}
      ${this.contextMenu(state)}
      ${this.damageIndicator(state)}
      ${this.areaFade(state)}
      ${DevOverlay(state)}
      <div class="prompt">${state.ui.prompt}</div>`;
  }

  private areaFade(state: GameState): string {
    const remaining = Math.max(0, state.ui.fadeUntil - state.clock);
    if (remaining <= 0) return '';
    const opacity = Math.min(0.72, remaining / 0.45);
    return `<div class="area-fade" style="opacity:${opacity.toFixed(2)}"></div>`;
  }

  private actionProgress(state: GameState): string {
    const casting = state.spellCasting;
    if (casting) {
      const spell = spellDefs[casting.spellId];
      const pct = Math.max(0, Math.min(100, 100 - (casting.remaining / casting.total) * 100));
      return `<div class="action-progress spell-progress"><b>${spell?.displayName ?? 'Casting'}</b><span>${Math.round(pct)}%</span><i style="width:${pct}%"></i></div>`;
    }
    const bandage = state.bandage;
    if (bandage) {
      const pct = Math.max(0, Math.min(100, 100 - (bandage.remaining / bandage.duration) * 100));
      return `<div class="action-progress bandage-progress"><b>Bandage</b><span>${Math.round(pct)}%</span><i style="width:${pct}%"></i></div>`;
    }
    const gathering = state.gathering;
    if (!gathering) return '';
    const pct = Math.max(0, Math.min(100, 100 - (gathering.remaining / gathering.duration) * 100));
    return `<div class="action-progress"><b>${gathering.actionLabel}</b><span>${Math.round(pct)}%</span><i style="width:${pct}%"></i></div>`;
  }

  private contextMenu(state: GameState): string {
    const menu = state.ui.contextMenu;
    if (!menu) return '';
    const target = menu.target?.kind === 'entity' ? state.entities[menu.target.entityId] : null;
    const hostile = target?.kind === 'enemy';
    const social = target?.kind === 'npc' || target?.kind === 'social';
    const container = target?.kind === 'container';
    const options = [
      social ? ['talk', 'Talk'] : null,
      social ? ['trade', 'Trade'] : null,
      hostile ? ['attack', 'Attack'] : null,
      container ? ['snoop', 'Snoop'] : null,
      container ? ['steal', 'Steal'] : null,
      ['inspect', 'Inspect'],
      ['use_tool', 'Use Tool'],
      ['cast_spell', 'Cast Spell'],
      target ? ['follow', 'Follow'] : null,
      ['mark', 'Mark on Map']
    ].filter(Boolean) as Array<[string, string]>;
    return `<section class="context-menu" style="left:${menu.x}px;top:${menu.y}px">
      ${target ? `<b>${target.name}</b>` : `<b>Ground</b>`}
      ${options.map(([command, label]) => `<button data-context-command="${command}">${label}</button>`).join('')}
    </section>`;
  }

  private damageIndicator(state: GameState): string {
    const age = state.clock - state.combat.lastDamagedAt;
    if (age < 0 || age > 0.7) return '';
    const opacity = Math.max(0, 1 - age / 0.7).toFixed(2);
    return `<div class="damage-indicator" style="opacity:${opacity}"></div>`;
  }

  private playerStatus(state: GameState): string {
    const stats = calculateDerivedStats(state);
    const pct = (value: number, max: number) => Math.round(Math.max(0, Math.min(100, (value / max) * 100)));
    const flags = [
      state.player.combatProfile.hidden ? 'Hidden' : '',
      state.player.combatProfile.poison ? 'Poisoned' : '',
      state.bandage ? 'Bandaging' : '',
      state.player.downed.active ? 'Downed' : '',
      state.combat.defenseUntil > state.clock ? 'Defending' : '',
      state.realtime.pendingAction ? 'Queued' : '',
      state.player.actionState.kind !== 'idle' && state.player.actionState.kind !== 'hidden' ? state.player.actionState.kind : ''
    ].filter(Boolean);
    return `<section class="player-status">
      <div class="portrait"><div class="voxel-portrait"></div><b>Lv. ${state.player.level}</b></div>
      <div class="bars">
        <strong>${state.player.name}</strong>
        <div class="bar hp"><i style="width:${pct(state.player.health, stats.maxHealth)}%"></i><span>${Math.round(state.player.health)}/${stats.maxHealth}</span></div>
        <div class="bar mana"><i style="width:${pct(state.player.mana, stats.maxMana)}%"></i><span>${Math.round(state.player.mana)}/${stats.maxMana}</span></div>
        <div class="bar stamina"><i style="width:${pct(state.player.stamina, stats.maxStamina)}%"></i><span>${Math.round(state.player.stamina)}/${stats.maxStamina}</span></div>
        ${flags.length ? `<div class="combat-flags">${flags.map((flag) => `<span>${flag}</span>`).join('')}</div>` : ''}
        ${state.player.downed.active ? `<button class="respawn-button" data-action="respawn">Respawn</button>` : ''}
      </div>
      <div class="quick-buttons">
        <button data-action="toggle-panel" data-panel="character">C</button>
        <button data-action="toggle-panel" data-panel="skills">K</button>
        <button data-action="toggle-panel" data-panel="inventory">I</button>
        <button data-action="toggle-panel" data-panel="spellbook">M</button>
        <button data-action="toggle-panel" data-panel="combatActions">A</button>
        <button data-action="toggle-panel" data-panel="journal">J</button>
        <button data-action="toggle-panel" data-panel="market">Market</button>
        <button data-action="toggle-panel" data-panel="help">?</button>
        <button data-action="toggle-build">Build</button>
      </div>
    </section>`;
  }

  private statusPanel(state: GameState): string {
    if (!state.ui.panels.status) return '';
    const attrs = state.player.attributes;
    return `<section class="panel status-panel">
      <header><span>Status</span><button data-action="toggle-panel" data-panel="status">x</button></header>
      <div class="status-row"><span>World Time</span><b>${state.world.time.hour.toString().padStart(2, '0')}:${state.world.time.minute.toString().padStart(2, '0')}</b></div>
      <div class="status-row"><span>Phase</span><b>${state.world.time.phase}</b></div>
      <div class="status-row"><span>Events</span><b>${state.world.activeEvents.length}</b></div>
      ${Object.entries(attrs).map(([name, value]) => `<div class="status-row"><span>${name}</span><b>${value}</b></div>`).join('')}
      <div class="status-row muted"><span>Weight</span><b>${calculateWeight(state).toFixed(0)}/${calculateDerivedStats(state).carryCapacity.toFixed(0)}</b></div>
    </section>`;
  }

  private renderLabels(state: GameState, renderer: VoxelRenderer): string {
    const labels: string[] = [];
    const hoveredEntityId = state.ui.hoverTarget?.kind === 'entity' ? state.ui.hoverTarget.entityId : null;
    const add = (position: Vec3, html: string, cls = '') => {
      const screen = renderer.worldToScreen(position);
      if (!screen.visible) return;
      labels.push(`<div class="world-label ${cls}" style="left:${screen.x}px;top:${screen.y}px">${html}</div>`);
    };

    add({ ...state.player.position, y: state.player.position.y + 1.45 }, '<b>Valen</b>', 'player-label');
    Object.values(state.entities).forEach((entity) => {
      if (entity.area !== state.player.currentArea) return;
      if (entity.kind === 'enemy' && entity.state === 'dead') return;
      if (entity.kind === 'resource' && entity.depleted) return;
      if (entity.kind === 'portal') {
        const near = Math.hypot(entity.position.x - state.player.position.x, entity.position.z - state.player.position.z) < 4.5;
        if (hoveredEntityId === entity.id || near) {
          add({ ...entity.position, y: entity.position.y + 1.2 }, `<b>${entity.name}</b><small>Click or press E</small>`, 'portal-label inspector-label');
        }
        return;
      }
      if (entity.kind === 'loot') {
        const near = Math.hypot(entity.position.x - state.player.position.x, entity.position.z - state.player.position.z) < 4.8;
        if (near || hoveredEntityId === entity.id) {
          add({ ...entity.position, y: entity.position.y + 0.8 }, entity.name, 'loot-label');
        }
        return;
      }
      if (entity.kind === 'container') {
        if (entity.hidden || entity.opened) return;
        const near = Math.hypot(entity.position.x - state.player.position.x, entity.position.z - state.player.position.z) < 5.2;
        if (near || hoveredEntityId === entity.id) {
          const stateText = entity.locked ? 'Locked' : entity.trap?.armed ? 'Warded' : 'Open';
          add({ ...entity.position, y: entity.position.y + 1.1 }, `<b>${entity.name}</b><small>${stateText}</small>`, 'loot-label inspector-label');
        }
        return;
      }
      if (entity.kind === 'enemy') {
        const pct = Math.max(0, (entity.health / entity.maxHealth) * 100);
        const near = Math.hypot(entity.position.x - state.player.position.x, entity.position.z - state.player.position.z) < 8.5;
        if (entity.id === state.player.activeTargetId || hoveredEntityId === entity.id || near) {
          add({ ...entity.position, y: entity.position.y + 1.7 }, `<span>${entity.name}</span><i><b style="width:${pct}%"></b></i>`, 'enemy-label');
        }
        return;
      }
      if (entity.kind === 'resource') {
        if (hoveredEntityId === entity.id || state.gathering?.entityId === entity.id) {
          add({ ...entity.position, y: entity.position.y + 2.2 }, `<b>${entity.name}</b><small>${entity.inspectText}</small>`, 'resource-label inspector-label');
        }
        return;
      }
      const near = Math.hypot(entity.position.x - state.player.position.x, entity.position.z - state.player.position.z) < 7.5;
      if (near || hoveredEntityId === entity.id) {
        add({ ...entity.position, y: entity.position.y + 1.55 }, `<b>${entity.name}</b>${entity.kind === 'npc' ? `<small>(${entity.role})</small>` : ''}`, entity.kind === 'npc' ? 'npc-label' : 'social-label');
      }
    });
    if (state.ui.targeting?.toolItemId && state.ui.hoverTarget?.kind === 'tile') {
      const label = inspectTargetForTool(state, state.ui.targeting.toolItemId, state.ui.hoverTarget);
      if (label) {
        add({ ...state.ui.hoverTarget.position, y: state.ui.hoverTarget.position.y + 1.1 }, `<b>${label}</b>`, 'resource-label inspector-label target-hint');
      }
    }
    state.floatingTexts.forEach((text) => {
      if (Math.hypot(text.position.x - state.player.position.x, text.position.z - state.player.position.z) > 11) return;
      add(text.position, `<span style="color:${text.color}">${text.text}</span>`, 'floating-label');
    });
    return labels.join('');
  }

  private bindEvents(): void {
    this.root.addEventListener(
      'pointerdown',
      (event) => {
        const target = event.target as HTMLElement;
        if (target.closest('button,input')) this.uiPointerDown = true;
      },
      true
    );

    const releasePointer = () => {
      window.setTimeout(() => {
        this.uiPointerDown = false;
        if (this.pendingHud != null) this.replaceHud(this.pendingHud);
      }, 0);
    };
    window.addEventListener('pointerup', releasePointer);
    window.addEventListener('pointercancel', releasePointer);

    this.root.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const button = target.closest<HTMLElement>('button');
      if (!button) return;
      event.preventDefault();

      const area = button.dataset.area;
      if (area) {
        this.dispatch({ type: 'SELECT_INVENTORY_SLOT', slot: null });
        this.dispatch({ type: 'SELECT_BANK_SLOT', slot: null });
        this.dispatch({ type: 'ENTER_AREA', areaId: area as GameState['player']['currentArea'] });
        return;
      }
      const hotbar = button.dataset.hotbar;
      if (hotbar != null) {
        this.dispatch({ type: 'USE_HOTBAR', slot: Number(hotbar) });
        return;
      }
      const invSlot = button.dataset.invSlot;
      if (invSlot != null) {
        const slot = Number(invSlot);
        const targeting = this.currentState?.ui.targeting;
        if (targeting?.mode === 'tool' && targeting.toolItemId) {
          this.dispatch({ type: 'USE_TOOL_ON_TARGET', toolItemId: targeting.toolItemId, target: { kind: 'inventory', owner: 'inventory', slot } });
          return;
        }
        this.dispatch({ type: 'SELECT_INVENTORY_SLOT', slot: this.currentState?.ui.selectedInventorySlot === slot ? null : slot });
        return;
      }
      const bankSlot = button.dataset.bankSlot;
      if (bankSlot != null) {
        const slot = Number(bankSlot);
        this.dispatch({ type: 'SELECT_BANK_SLOT', slot: this.currentState?.ui.selectedBankSlot === slot ? null : slot });
        return;
      }
      const tradeSlot = button.dataset.tradeSlot;
      if (tradeSlot != null) {
        this.dispatch({ type: 'MOVE_ITEM', from: 'trade-player', to: 'inventory', slot: Number(tradeSlot) });
        return;
      }
      const buySlot = button.dataset.buySlot;
      if (buySlot != null) {
        this.dispatch({ type: 'BUY_MERCHANT_ITEM', slot: Number(buySlot) });
        return;
      }
      const trainSkill = button.dataset.trainSkill;
      if (trainSkill) {
        this.dispatch({ type: 'TRAIN_SKILL', skillId: trainSkill });
        return;
      }
      const chatTab = button.dataset.chatTab;
      if (chatTab) {
        this.dispatch({ type: 'SET_CHAT_TAB', channel: chatTab as GameState['ui']['chatTab'] });
        return;
      }
      const marketCategory = button.dataset.marketCategory;
      if (marketCategory) {
        this.dispatch({ type: 'SET_MARKET_FILTER', category: marketCategory as GameState['ui']['marketCategory'] });
        return;
      }
      const recipe = button.dataset.recipe;
      if (recipe) {
        this.dispatch({ type: 'SELECT_RECIPE', recipeId: recipe });
        return;
      }
      const craftStation = button.dataset.craftStation;
      if (craftStation) {
        this.dispatch({ type: 'SET_CRAFT_STATION', stationType: craftStation as GameState['ui']['selectedStationType'] });
        return;
      }
      const spell = button.dataset.spell;
      if (spell) {
        this.dispatch({ type: 'SELECT_SPELL', spellId: spell });
        return;
      }
      const buildPiece = button.dataset.buildPiece;
      if (buildPiece) {
        this.dispatch({ type: 'SET_BUILD_PIECE', pieceId: buildPiece });
        return;
      }
      const buildCategory = button.dataset.buildCategory;
      if (buildCategory) {
        const first = buildPieces.find((piece) => piece.category === buildCategory)?.id;
        this.dispatch({ type: 'SET_BUILD_PIECE', pieceId: first ?? 'stone_wall', category: buildCategory as GameState['ui']['selectedBuildCategory'] });
        return;
      }
      const housingStorage = button.dataset.housingStorage;
      if (housingStorage) {
        this.dispatch({ type: 'SELECT_HOUSING_STORAGE', storageId: housingStorage });
        return;
      }
      const housingWithdraw = button.dataset.housingWithdraw;
      if (housingWithdraw) {
        const [storageId, slot] = housingWithdraw.split(':');
        this.dispatch({ type: 'WITHDRAW_HOUSING_SLOT', storageId, slot: Number(slot) });
        return;
      }
      const housingStorageUpgrade = button.dataset.housingStorageUpgrade;
      if (housingStorageUpgrade) {
        this.dispatch({ type: 'UPGRADE_HOUSING_STORAGE', storageId: housingStorageUpgrade });
        return;
      }
      const housingGarden = button.dataset.housingGarden;
      if (housingGarden) {
        this.dispatch({ type: 'HARVEST_HOUSING_GARDEN', buildingId: housingGarden });
        return;
      }
      const homeCraftStation = button.dataset.homeCraftStation;
      if (homeCraftStation) {
        this.dispatch({ type: 'SET_CRAFT_STATION', stationType: homeCraftStation as GameState['ui']['selectedStationType'] });
        this.dispatch({ type: 'TOGGLE_PANEL', panel: 'crafting', open: true });
        this.dispatch({ type: 'TOGGLE_PANEL', panel: 'inventory', open: true });
        return;
      }
      const skillGroup = button.dataset.skillGroup;
      if (skillGroup) {
        this.dispatch({ type: 'SET_SKILL_GROUP', group: skillGroup });
        return;
      }
      const skillMode = button.dataset.skillMode;
      if (skillMode) {
        this.dispatch({ type: 'SET_SKILL_MODE', skillId: skillMode, mode: (button.dataset.mode ?? 'lock') as GameState['player']['skills'][string]['mode'] });
        return;
      }
      const bardSkill = button.dataset.bardSkill;
      if (bardSkill === 'Peacemaking' || bardSkill === 'Provocation' || bardSkill === 'Discordance') {
        this.dispatch({ type: 'USE_BARD_SKILL', skillId: bardSkill });
        return;
      }
      const weaponAbility = button.dataset.weaponAbility;
      if (weaponAbility) {
        this.dispatch({ type: 'USE_WEAPON_ABILITY', abilityId: weaponAbility });
        return;
      }
      const repairSlot = button.dataset.repairSlot;
      if (repairSlot) {
        this.dispatch({ type: 'REPAIR_EQUIPPED_ITEM', slot: repairSlot as EquipmentSlot });
        return;
      }
      const workOrder = button.dataset.workOrder;
      if (workOrder) {
        this.dispatch({ type: 'COMPLETE_WORK_ORDER', orderId: workOrder });
        return;
      }
      const marketOrder = button.dataset.marketOrder;
      if (marketOrder) {
        this.dispatch({ type: 'FULFILL_MARKET_ORDER', orderId: marketOrder });
        return;
      }
      const completeQuest = button.dataset.completeQuest;
      if (completeQuest) {
        this.dispatch({ type: 'COMPLETE_QUEST', questId: completeQuest });
        return;
      }
      const devScene = button.dataset.devScene;
      if (devScene) {
        this.dispatch({ type: 'DEV_TELEPORT_SCENE', sceneId: devScene });
        return;
      }
      const devArea = button.dataset.devArea;
      if (devArea) {
        this.dispatch({ type: 'DEV_TELEPORT_AREA', areaId: devArea as GameState['player']['currentArea'] });
        return;
      }
      const devSpawnItem = button.dataset.devSpawnItem;
      if (devSpawnItem) {
        this.dispatch({ type: 'DEV_SPAWN_ITEM', itemId: devSpawnItem, quantity: 10 });
        return;
      }
      const devSpawnEnemy = button.dataset.devSpawnEnemy;
      if (devSpawnEnemy === 'Undead' || devSpawnEnemy === 'Bandit' || devSpawnEnemy === 'Beast' || devSpawnEnemy === 'Cultist') {
        this.dispatch({ type: 'DEV_SPAWN_ENEMY', enemyType: devSpawnEnemy });
        return;
      }
      const devAddGold = button.dataset.devAddGold;
      if (devAddGold) {
        this.dispatch({ type: 'DEV_ADD_GOLD', amount: Number(devAddGold) });
        return;
      }
      if (button.dataset.devResetResources) {
        this.dispatch({ type: 'DEV_RESET_RESOURCES' });
        return;
      }
      if (button.dataset.devCompleteQuestStep) {
        this.dispatch({ type: 'DEV_COMPLETE_QUEST_STEP' });
        return;
      }
      const devGiveSpell = button.dataset.devGiveSpell;
      if (devGiveSpell) {
        this.dispatch({ type: 'DEV_GIVE_SPELL', spellId: devGiveSpell });
        return;
      }
      const devTimePhase = button.dataset.devTimePhase;
      if (devTimePhase === 'dawn' || devTimePhase === 'day' || devTimePhase === 'dusk' || devTimePhase === 'night') {
        this.dispatch({ type: 'DEV_SIMULATE_TIME', phase: devTimePhase });
        return;
      }
      const devSkill = button.dataset.devSkill;
      if (devSkill) {
        this.dispatch({ type: 'DEV_SET_SKILL', skillId: devSkill, value: Number(button.dataset.value ?? 75) });
        return;
      }

      const action = button.dataset.action;
      const contextCommand = button.dataset.contextCommand;
      if (contextCommand) {
        this.dispatch({ type: 'CONTEXT_ACTION', command: contextCommand as 'talk' | 'trade' | 'attack' | 'inspect' | 'use_tool' | 'cast_spell' | 'snoop' | 'steal' | 'follow' | 'mark' });
        return;
      }
      if (!action) return;
      this.handleAction(action, button);
    });

    this.root.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      if (form.dataset.action !== 'send-chat') return;
      event.preventDefault();
      const input = form.querySelector<HTMLInputElement>('input[name="chat"]');
      this.dispatch({ type: 'SEND_CHAT', text: input?.value ?? '' });
      if (input) input.value = '';
    });

    this.root.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement;
      if (target.dataset.action === 'trade-gold') {
        this.dispatch({ type: 'SET_TRADE_GOLD', side: 'player', amount: Number(target.value) });
      }
    });

    this.root.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement;
      if (target.dataset.action === 'skill-search') {
        this.dispatch({ type: 'SET_SKILL_SEARCH', search: target.value });
        if (this.currentState) {
          this.replaceHud(this.renderHud(this.currentState));
          const search = this.root.querySelector<HTMLInputElement>('.skill-search');
          if (search) {
            search.focus();
            search.setSelectionRange(search.value.length, search.value.length);
          }
        }
      }
      if (target.dataset.action === 'market-search') {
        this.dispatch({ type: 'SET_MARKET_SEARCH', search: target.value });
        if (this.currentState) {
          this.replaceHud(this.renderHud(this.currentState));
          const search = this.root.querySelector<HTMLInputElement>('.market-search');
          if (search) {
            search.focus();
            search.setSelectionRange(search.value.length, search.value.length);
          }
        }
      }
    });

    this.root.addEventListener('dragstart', (event) => {
      const source = (event.target as HTMLElement).closest<HTMLElement>('[data-hotbar-source]');
      if (!source?.dataset.hotbarSource || !event.dataTransfer) return;
      event.dataTransfer.setData('text/plain', source.dataset.hotbarSource);
      event.dataTransfer.effectAllowed = 'copy';
    });

    this.root.addEventListener('dragover', (event) => {
      const slot = (event.target as HTMLElement).closest<HTMLElement>('[data-hotbar-drop]');
      if (!slot) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    });

    this.root.addEventListener('drop', (event) => {
      const slot = (event.target as HTMLElement).closest<HTMLElement>('[data-hotbar-drop]');
      if (!slot || !event.dataTransfer) return;
      event.preventDefault();
      const binding = this.parseHotbarSource(event.dataTransfer.getData('text/plain'));
      if (!binding) return;
      this.dispatch({ type: 'SET_HOTBAR_SLOT', slot: Number(slot.dataset.hotbarDrop), binding });
    });
  }

  private parseHotbarSource(source: string): HotbarBinding | null {
    const [kind, id] = source.split(':');
    if (!kind || !id) return null;
    if (kind === 'item') return { kind: 'item', id };
    if (kind === 'tool') return { kind: 'tool', id };
    if (kind === 'spell') return { kind: 'spell', id };
    if (kind === 'skill') return { kind: 'skill', id };
    if (kind === 'action' && (id === 'attack' || id === 'ranged' || id === 'utility' || id === 'hide' || id === 'defend' || id === 'interact' || id === 'build')) return { kind: 'action', id };
    return null;
  }

  private handleAction(action: string, element: HTMLElement): void {
    switch (action) {
      case 'toggle-panel':
        this.dispatch({ type: 'TOGGLE_PANEL', panel: element.dataset.panel ?? 'inventory' });
        break;
      case 'toggle-build':
        this.dispatch({ type: 'TOGGLE_BUILD_MODE' });
        break;
      case 'hide':
        this.dispatch({ type: 'HIDE' });
        break;
      case 'bandage':
        this.dispatch({ type: 'START_BANDAGE', target: { kind: 'self' } });
        break;
      case 'apply-poison':
        this.dispatch({ type: 'APPLY_POISON' });
        break;
      case 'defensive-action':
        this.dispatch({ type: 'DEFENSIVE_ACTION' });
        break;
      case 'clear-selected-item':
        this.dispatch({ type: 'SELECT_INVENTORY_SLOT', slot: null });
        break;
      case 'save-game':
        this.dispatch({ type: 'SAVE_GAME' });
        break;
      case 'toggle-pause':
        this.dispatch({ type: 'TOGGLE_PAUSE' });
        break;
      case 'ui-scale-up':
        this.dispatch({ type: 'SET_UI_SCALE', scale: (this.currentState?.ui.uiScale ?? 1) + 0.05 });
        break;
      case 'ui-scale-down':
        this.dispatch({ type: 'SET_UI_SCALE', scale: (this.currentState?.ui.uiScale ?? 1) - 0.05 });
        break;
      case 'toggle-reduced-motion':
        this.dispatch({ type: 'TOGGLE_REDUCED_MOTION' });
        break;
      case 'decipher-map':
        this.dispatch({ type: 'DECIPHER_TREASURE_MAP' });
        break;
      case 'pin-map':
        this.dispatch({ type: 'PIN_TREASURE_MAP' });
        break;
      case 'respawn':
        this.dispatch({ type: 'RESPAWN' });
        break;
      case 'toggle-dev-overlay':
        this.dispatch({ type: 'TOGGLE_DEV_OVERLAY' });
        break;
      case 'dev-export-telemetry':
        this.dispatch({ type: 'DEV_EXPORT_TELEMETRY' });
        break;
      case 'use-selected':
        this.withSelectedInventory((slot) => this.dispatch({ type: 'USE_ITEM', slot }));
        break;
      case 'equip-selected':
        this.withSelectedInventory((slot) => this.dispatch({ type: 'EQUIP_ITEM', slot }));
        break;
      case 'split-selected':
        this.withSelectedInventory((slot) => this.dispatch({ type: 'SPLIT_STACK', slot }));
        break;
      case 'deposit-selected':
        this.withSelectedInventory((slot) => this.dispatch({ type: 'MOVE_ITEM', from: 'inventory', to: 'bank', slot }));
        break;
      case 'withdraw-selected':
        this.withSelectedBank((slot) => this.dispatch({ type: 'MOVE_ITEM', from: 'bank', to: 'inventory', slot }));
        break;
      case 'offer-selected':
        this.withSelectedInventory((slot) => this.dispatch({ type: 'MOVE_ITEM', from: 'inventory', to: 'trade-player', slot }));
        break;
      case 'take-all-bank':
        for (let i = 0; i < (this.currentState?.player.bank.capacity ?? 0); i += 1) this.dispatch({ type: 'MOVE_ITEM', from: 'bank', to: 'inventory', slot: i });
        break;
      case 'cancel-trade':
        this.dispatch({ type: 'CANCEL_TRADE' });
        break;
      case 'close-merchant':
        this.dispatch({ type: 'CLOSE_MERCHANT' });
        break;
      case 'sell-selected':
        this.withSelectedInventory((slot) => this.dispatch({ type: 'SELL_MERCHANT_ITEM', slot }));
        break;
      case 'train-skill':
        if (element.dataset.skillId) this.dispatch({ type: 'TRAIN_SKILL', skillId: element.dataset.skillId });
        break;
      case 'lock-trade':
        this.dispatch({ type: 'LOCK_TRADE', side: 'player' });
        break;
      case 'craft-selected':
        this.dispatch({ type: 'START_CRAFT', recipeId: this.currentRecipe(), quantity: this.currentState?.ui.craftQuantity ?? 1 });
        break;
      case 'cast-selected-spell':
        this.dispatch({ type: 'CAST_SPELL', spellId: this.currentState?.ui.selectedSpellId ?? 'magic_arrow' });
        break;
      case 'meditate':
        this.dispatch({ type: 'USE_SKILL_ON_TARGET', skillId: 'Meditation', target: { kind: 'self' } });
        break;
      case 'craft-qty-down':
        this.dispatch({ type: 'SET_CRAFT_QUANTITY', quantity: (this.currentState?.ui.craftQuantity ?? 1) - 1 });
        break;
      case 'craft-qty-up':
        this.dispatch({ type: 'SET_CRAFT_QUANTITY', quantity: (this.currentState?.ui.craftQuantity ?? 1) + 1 });
        break;
      case 'place-building':
        this.dispatch({ type: 'PLACE_BUILDING' });
        break;
      case 'claim-plot':
        this.dispatch({ type: 'CLAIM_STARTER_PLOT' });
        break;
      case 'upgrade-housing':
        this.dispatch({ type: 'UPGRADE_HOUSING_TIER' });
        break;
      case 'undo-building':
        this.dispatch({ type: 'UNDO_LAST_BUILDING' });
        break;
      case 'move-last-building':
        this.dispatch({ type: 'BEGIN_MOVE_LAST_BUILDING' });
        break;
      case 'deposit-housing-selected':
        this.withSelectedInventory((slot) => this.dispatch({ type: 'DEPOSIT_HOUSING_SELECTED', slot }));
        break;
      case 'rest-at-home':
        this.dispatch({ type: 'REST_AT_HOME' });
        break;
    }
  }

  private withSelectedInventory(fn: (slot: number) => void): void {
    const slot = this.currentState?.ui.selectedInventorySlot;
    if (slot != null) fn(slot);
  }

  private withSelectedBank(fn: (slot: number) => void): void {
    const slot = this.currentState?.ui.selectedBankSlot;
    if (slot != null) fn(slot);
  }

  private currentRecipe(): string {
    return this.currentState?.ui.selectedRecipeId ?? 'iron_armor';
  }
}
