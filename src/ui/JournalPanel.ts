import { areas } from '../data/areas';
import { itemDefs } from '../data/items';
import { recipes, stationLabels } from '../data/recipes';
import { treasureMapDefinitions } from '../data/treasure';
import { tutorialQuestIds } from '../data/quests';
import { skillDefinitions } from '../data/skillDefinitions';
import { spellDefs } from '../data/spells';
import type { AreaId, GameState, QuestState, Vec3 } from '../game/types';
import { deriveFirstHourDirector, FIRST_HOUR_RECOMMENDED_SKILLS } from '../systems/FirstHourDirector';
import { getItemCount } from '../systems/InventorySystem';
import { describeProfessionGoal } from '../systems/ProfessionSystem';

function attr(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
}

function waypointButton(areaId: AreaId, position: Vec3, label: string, source: 'rumor' | 'treasure' | 'objective'): string {
  return `<button data-map-waypoint-area="${areaId}" data-map-waypoint-x="${Math.round(position.x)}" data-map-waypoint-z="${Math.round(position.z)}" data-map-waypoint-label="${attr(label)}" data-map-waypoint-source="${source}">Waypoint</button>`;
}

const areaNotes: Record<string, string> = {
  town: 'Safe town hub with Mira, market and rumor boards, trainers, services, and road leads.',
  bank: 'Safe storage for spare resources and gold.',
  blacksmith: 'Forge, mining training, repairs, and metal work orders.',
  forest: 'Trees, ore, herbs, hunter camp supplies, rare yew rumors, and the mine approach.',
  crypt: 'Dungeon danger, mine seams, side room locks, traps, magic utility points, and undead patrols.',
  road: 'Bandit risk, caravan trouble, shrine supplies, tracks, hidden cache, and guard patrols.',
  housing: 'Persistent plot with starter crate, workbench frame, storage, trophy hook, and upgrades.'
};

function objectiveProgress(quest: QuestState | undefined, type: string, labelIncludes?: string): number {
  const objective = quest?.objectives.find((candidate) => candidate.type === type && (!labelIncludes || candidate.label.includes(labelIncludes)));
  return objective ? objective.progress / objective.required : 0;
}

function unlockedMechanics(state: GameState): Array<{ title: string; text: string }> {
  const prepare = state.quests.prepare_for_road;
  const mage = state.quests.mages_errand;
  const road = state.quests.trouble_on_road;
  const crypt = state.quests.bones_beneath;
  const entries = [
    { title: 'Movement and Interaction', text: 'WASD or click to move. Click a nearby person, object, portal, or press E to interact.' },
    { title: 'Inventory and Hotbar', text: 'Inventory holds your road kit. Drag items, spells, or skills onto hotbar slots 1-0.' }
  ];
  if (state.ui.panels.skills || objectiveProgress(prepare, 'open_panel', 'Skills') > 0) {
    entries.push({ title: 'Skills', text: 'Skills rise by use. The thin lower bar shows progress toward the next gain.' });
  }
  if (objectiveProgress(prepare, 'gather') > 0 || (state.player.skills.Lumberjacking?.lastGainAt ?? 0) > 0 || (state.player.skills.Mining?.lastGainAt ?? 0) > 0) {
    entries.push({ title: 'Gathering', text: 'Axes harvest trees, pickaxes harvest rock faces. Depleted resources recover after a short wait.' });
  }
  if (objectiveProgress(prepare, 'bank') > 0 || state.world.discoveredAreas.includes('bank')) {
    entries.push({ title: 'Banking', text: 'Eldon stores spare resources safely. Banking one resource completes the first road kit loop.' });
  }
  if (state.ui.panels.spellbook || objectiveProgress(mage, 'cast') > 0) {
    entries.push({ title: 'Magery and Reagents', text: 'Most spells cost mana and reagents. Buy ash for Magic Arrow; ginseng and garlic support healing.' });
  }
  if (objectiveProgress(state.quests.patch_yourself_up, 'bandage') > 0 || getItemCount(state.player.inventory, 'bandage') < 8) {
    entries.push({ title: 'Bandages', text: 'Bandages take time, can slip under pressure, and train Healing with Anatomy support.' });
  }
  if (state.player.completedQuestIds.includes('prepare_for_road') || objectiveProgress(road, 'enter_area') > 0) {
    entries.push({ title: 'Road Risk', text: 'Road enemies telegraph danger. Target first, then use potions, bandages, defense, or range as needed.' });
  }
  if (objectiveProgress(crypt, 'cast', 'Detect Magic') > 0 || objectiveProgress(crypt, 'open_container') > 0) {
    entries.push({ title: 'Dungeon Secrets', text: 'Detect Magic reveals hidden caches and traps before you risk a lockpick or unlock spell.' });
  }
  if (getItemCount(state.player.inventory, 'rough_treasure_map') > 0 || getItemCount(state.player.inventory, 'map_fragment') > 0 || Object.values(state.world.treasure.maps).some((map) => map.found)) {
    entries.push({ title: 'Treasure Hunting', text: 'Combine three fragments, decipher the map with Cartography, then use a shovel near the clue.' });
  }
  if (state.player.currentArea === 'housing' || state.world.placedBuildings.length > 0 || getItemCount(state.player.inventory, 'stone_block') + getItemCount(state.player.inventory, 'wood') >= 20) {
    entries.push({ title: 'Housing', text: 'Your plot unlocks when you carry enough wood, stone, or torches. Build only inside the fenced plot.' });
  }
  return entries;
}

function activeQuestSummary(quest: QuestState): string {
  const next = quest.objectives.find((objective) => objective.progress < objective.required) ?? quest.objectives[0];
  return `${next.label} (${next.progress}/${next.required})`;
}

export function JournalPanel(state: GameState): string {
  if (!state.ui.panels.journal) return '';
  const firstHour = deriveFirstHourDirector(state);
  const pinnedProfessionGoal = describeProfessionGoal(state.ui.pinnedProfessionGoalId, state);
  const activeQuests = state.player.activeQuestIds.map((id) => state.quests[id]).filter(Boolean);
  const completedTutorials = tutorialQuestIds.map((id) => state.quests[id]).filter((quest) => quest && state.player.completedQuestIds.includes(quest.id));
  const mechanics = unlockedMechanics(state);
  const relevantSkills = FIRST_HOUR_RECOMMENDED_SKILLS
    .map((id) => skillDefinitions.find((definition) => definition.id === id))
    .filter(Boolean);
  const recipeUnlocked =
    state.ui.panels.crafting ||
    state.player.currentArea === 'blacksmith' ||
    state.player.completedQuestIds.includes('ore_for_brom') ||
    state.quests.ore_for_brom?.objectives.some((objective) => objective.type === 'craft' && objective.progress > 0);
  const marketUnlocked =
    recipeUnlocked ||
    mechanics.some((entry) => entry.title === 'Gathering') ||
    state.world.economy.transactionLog.some((entry) => entry.kind === 'market' || entry.kind === 'work_order');
  const spells = state.player.spellbook.knownSpellIds.map((id) => spellDefs[id]).filter(Boolean);
  const rumors = state.world.activeEvents.filter((event) => event.discovered || state.world.discoveredRumorIds.includes(event.id));
  const pinnedRumor = rumors.find((event) => event.id === state.ui.pinnedRumorId);
  const pinnedWorkOrder = state.world.economy.workOrders.find((order) => order.id === state.ui.pinnedWorkOrderId && order.status === 'open');
  const hasMapFragments = getItemCount(state.player.inventory, 'map_fragment') > 0;
  const hasRoughMap = getItemCount(state.player.inventory, 'rough_treasure_map') > 0;
  const treasureClues = Object.entries(state.world.treasure.maps)
    .filter(([, runtime]) => runtime.fragmentCount > 0 || runtime.decipheredPrecision > 0 || runtime.found || runtime.pinned || hasMapFragments || hasRoughMap)
    .map(([id, runtime]) => ({ definition: treasureMapDefinitions[id], runtime }))
    .filter((entry) => entry.definition);
  const housingResourceSummary = [
    { itemId: 'wood', need: 12 },
    { itemId: 'stone_block', need: 12 },
    { itemId: 'torch', need: 4 }
  ];
  const completedEvents = [
    ...completedTutorials.map((quest) => `${quest.title}: ${quest.description}`),
    ...(state.world.resolvedEventLog ?? [])
  ];
  const goals = [
    'Build a workshop: carry 12 wood and 12 stone to the river plot.',
    'Craft an exceptional item: raise a craft skill, then repeat higher-difficulty recipes.',
    'Decipher a treasure map: look for lockpicks, Detect Magic, and dungeon caches.',
    'Learn Recall: find or buy a rune, then Mark a safe place.',
    'Unlock cottage tier: place a floor, wall, light, and storage on your plot.',
    'Defeat the crypt miniboss: prepare Night Sight, bandages, potions, and a trap check.'
  ];

  return `<section class="panel journal-panel ui-contained-window" data-window-id="journal">
    <header><span>Journal</span><button data-action="toggle-panel" data-panel="journal">x</button></header>
    <div class="journal-body">
      <div class="journal-section route" data-journal-section="current-objective">
        <h3>Current Objective</h3>
        ${
          pinnedProfessionGoal
            ? `<article><b>Pinned Profession Goal</b><span>${attr(pinnedProfessionGoal.label)} · ${attr(pinnedProfessionGoal.detail)}</span></article>`
            : ''
        }
        ${
          pinnedRumor
            ? `<article><b>Pinned Rumor</b><span>${attr(pinnedRumor.title)} · ${attr(pinnedRumor.rumor)}</span>${pinnedRumor.position ? waypointButton(pinnedRumor.area, pinnedRumor.position, pinnedRumor.title, 'rumor') : ''}</article>`
            : ''
        }
        ${
          pinnedWorkOrder
            ? `<article><b>Pinned Work Order</b><span>${attr(pinnedWorkOrder.title ?? pinnedWorkOrder.requester)} · ${attr(
                (pinnedWorkOrder.requiredItems ?? [{ itemId: pinnedWorkOrder.itemId, quantity: pinnedWorkOrder.quantity }])
                  .map((requirement) => `${itemDefs[requirement.itemId]?.name ?? requirement.itemId} ${getItemCount(state.player.inventory, requirement.itemId)}/${requirement.quantity}`)
                  .join(' · ')
              )} · Reward ${pinnedWorkOrder.rewardGold}g</span></article>`
            : ''
        }
        <article>
          <b>Next: ${attr(firstHour.nextStep?.label ?? 'First-hour route complete')}</b>
          <span>Progress ${firstHour.progress.done}/${firstHour.progress.total} · Skills touched ${firstHour.skills.touchedCount}/${firstHour.skills.target}</span>
          ${firstHour.objective ? waypointButton(firstHour.objective.areaId, firstHour.objective.position, firstHour.objective.label, firstHour.objective.source) : ''}
          ${firstHour.hint.unlocked ? `<small>${attr(firstHour.hint.text)}</small>` : ''}
        </article>
        <article>
          <b>Systems touched</b>
          <span>${firstHour.systems.filter((system) => system.done).map((system) => system.label).join(', ') || 'None yet'}</span>
        </article>
        <article>
          <b>Skill events</b>
          <span>${
            firstHour.skills.events.length
              ? firstHour.skills.events
                  .slice(0, 5)
                  .map((event) => `${attr(event.label)} ${event.value.toFixed(1)}${event.gained > 0 ? ` (+${event.gained.toFixed(2)})` : ''}`)
                  .join(' · ')
              : `No skill events yet. Try ${firstHour.skills.missingSuggestions.slice(0, 3).map(attr).join(', ')}.`
          }</span>
        </article>
        <div class="journal-route-list">
          ${firstHour.milestones
            .slice(0, 8)
            .map((milestone) => {
              const stateLabel = milestone.done ? 'Done' : milestone.id === firstHour.nextStep?.id ? 'Next' : 'Soon';
              return `<article class="${milestone.done ? 'done' : 'todo'}"><b>${stateLabel}</b><span>${attr(milestone.label)}</span></article>`;
            })
            .join('')}
        </div>
        ${
          firstHour.discoveries.length
            ? `<article><b>Discoveries</b><span>${firstHour.discoveries.map(attr).join(' · ')}</span></article>`
            : '<small>Discoveries, rumors, map clues, and hidden objects will appear here as you travel.</small>'
        }
      </div>
      <div class="journal-section" data-journal-section="active-quests">
        <h3>Active Quests</h3>
        ${
          activeQuests.length
            ? activeQuests.map((quest) => `<article><b>${quest.title}</b><span>${activeQuestSummary(quest)}</span></article>`).join('')
            : '<small>No active quests. Talk to townsfolk for leads.</small>'
        }
      </div>
      <div class="journal-section" data-journal-section="discovered-mechanics">
        <h3>Discovered Mechanics</h3>
        ${mechanics.map((entry) => `<article><b>${entry.title}</b><span>${entry.text}</span></article>`).join('')}
      </div>
      <div class="journal-section compact" data-journal-section="profession-goals">
        <h3>Profession Goals</h3>
        ${goals.slice(0, 6).map((goal) => `<article><span>${goal}</span></article>`).join('')}
        <details><summary>Related skills</summary>
          ${relevantSkills
            .map((definition) => {
              const skill = state.player.skills[definition!.id];
              return `<article data-hotbar-source="skill:${attr(definition!.id)}" draggable="true"><b>${definition!.displayName}</b><span>${skill?.value.toFixed(1) ?? '0.0'} · ${definition!.verbs.slice(0, 2).join(', ')}</span></article>`;
            })
            .join('')}
        </details>
      </div>
      <div class="journal-section compact" data-journal-section="known-locations">
        <h3>Known Locations</h3>
        ${state.world.discoveredAreas.map((areaId) => `<article><b>${areas[areaId].name}</b><span>${areaNotes[areaId] ?? areas[areaId].palette}</span></article>`).join('')}
      </div>
      <div class="journal-section compact" data-journal-section="spells-learned">
        <h3>Spells Learned</h3>
        ${spells.map((spell) => `<article data-hotbar-source="spell:${attr(spell.id)}" draggable="true"><b>${spell.displayName}</b><span>Circle ${spell.circle} · Mana ${spell.manaCost}</span></article>`).join('')}
      </div>
      <div class="journal-section compact" data-journal-section="recipes-learned">
        <h3>Recipes Learned</h3>
        ${
          recipeUnlocked
            ? recipes
                .slice(0, 7)
                .map((recipe) => `<article><b>${recipe.name}</b><span>${stationLabels[recipe.stationType]} · ${itemDefs[recipe.outputItemId]?.name ?? recipe.outputItemId}</span></article>`)
                .join('')
            : '<small>Use a station or complete Broms first forge task to start logging recipes.</small>'
        }
      </div>
      <div class="journal-section compact" data-journal-section="rumors">
        <h3>Rumors</h3>
        ${
          rumors.length
            ? rumors
                .map(
                  (event) => `<article class="${state.ui.pinnedRumorId === event.id ? 'pinned' : ''}"><b>${event.title}</b><span>${event.rumor}</span><small>${areas[event.area].name}${event.position ? ` · map lead ${Math.round(event.position.x)}:${Math.round(event.position.z)}` : ''}</small><button data-pin-rumor="${attr(event.id)}">${state.ui.pinnedRumorId === event.id ? 'Unpin' : 'Pin'}</button>${event.position ? waypointButton(event.area, event.position, event.title, 'rumor') : ''}</article>`
                )
                .join('')
            : '<small>No fresh rumors yet. Taverns, market days, and roads will add leads here.</small>'
        }
      </div>
      <div class="journal-section compact" data-journal-section="treasure-clues">
        <h3>Treasure Clues</h3>
        ${
          treasureClues.length
            ? treasureClues
                .map(
                  ({ definition, runtime }) => `<article><b>${definition.regionHint} clue</b><span>${runtime.found ? 'Found.' : runtime.decipheredPrecision > 0 ? definition.clueText : 'Fragments hint at a buried cache.'}</span><small>Cartography ${definition.requiredCartography} · ${runtime.fragmentCount}/3 fragments · ${runtime.pinned ? 'Pinned' : 'Not pinned'}</small>${waypointButton(definition.regionHint, definition.approximateCoordinate, `${areas[definition.regionHint].name} treasure clue`, 'treasure')}</article>`
                )
                .join('')
            : '<small>Map fragments, deciphered maps, and pinned treasure leads will appear here.</small>'
        }
      </div>
      <div class="journal-section compact" data-journal-section="housing-plans">
        <h3>Housing Plans</h3>
        <article><b>Starter plot</b><span>${state.world.housing.ownedPlotId ? 'Claimed. Place useful stations, light, storage, and a bedroll before upgrading.' : 'Travel by ferry and claim the river plot when ready.'}</span></article>
        <article><b>Build resources</b><span>${housingResourceSummary.map((req) => `${itemDefs[req.itemId]?.name ?? req.itemId} ${getItemCount(state.player.inventory, req.itemId)}/${req.need}`).join(' · ')}</span></article>
        <article><b>Placed pieces</b><span>${state.world.placedBuildings.filter((piece) => piece.area === 'housing').length} on plot · ${Object.keys(state.world.housing.storages).length} storage units</span></article>
      </div>
      <div class="journal-section compact" data-journal-section="completed-events">
        <h3>Completed Events</h3>
        ${
          completedEvents.length
            ? completedEvents.map((event) => `<article><span>${attr(event)}</span></article>`).join('')
            : '<small>Completed quests and resolved world events will be stored here.</small>'
        }
      </div>
      <div class="journal-section compact" data-journal-section="market-state">
        <h3>Market State</h3>
        <article><b>Market demand</b><span>${marketUnlocked ? 'Work orders show exact item counts and gold before delivery.' : 'The market board opens after your first gathered or crafted goods.'}</span></article>
      </div>
    </div>
  </section>`;
}
