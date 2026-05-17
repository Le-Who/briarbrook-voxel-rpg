import { areas } from '../data/areas';
import { itemDefs } from '../data/items';
import { recipes, stationLabels } from '../data/recipes';
import { tutorialQuestIds } from '../data/quests';
import { skillDefinitions } from '../data/skillDefinitions';
import { spellDefs } from '../data/spells';
import type { GameState, QuestState } from '../game/types';
import { getItemCount } from '../systems/InventorySystem';

function attr(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
}

const areaNotes: Record<string, string> = {
  town: 'Safe town hub with Mira, merchants, trainers, and road leads.',
  bank: 'Safe storage for spare resources and gold.',
  blacksmith: 'Forge, mining training, repairs, and metal work orders.',
  forest: 'Trees, ore, herbs, and the path toward the old mine.',
  crypt: 'Dungeon danger, hidden magic, locked containers, and undead.',
  road: 'Bandit risk, caravan rumors, and the first combat route.',
  housing: 'Persistent plot for building, storage, and long-term upgrades.'
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
  const activeQuests = state.player.activeQuestIds.map((id) => state.quests[id]).filter(Boolean);
  const completedTutorials = tutorialQuestIds.map((id) => state.quests[id]).filter((quest) => quest && state.player.completedQuestIds.includes(quest.id));
  const mechanics = unlockedMechanics(state);
  const relevantSkills = ['Lumberjacking', 'Mining', 'Healing', 'Magery', 'Meditation', 'Swordsmanship', 'Archery', 'Lockpicking', 'Carpentry']
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
  const goals = [
    'Build a workshop: carry 12 wood and 12 stone to the river plot.',
    'Craft an exceptional item: raise a craft skill, then repeat higher-difficulty recipes.',
    'Decipher a treasure map: look for lockpicks, Detect Magic, and dungeon caches.',
    'Learn Recall: find or buy a rune, then Mark a safe place.',
    'Unlock cottage tier: place a floor, wall, light, and storage on your plot.',
    'Defeat the crypt miniboss: prepare Night Sight, bandages, potions, and a trap check.'
  ];

  return `<section class="panel journal-panel">
    <header><span>Journal</span><button data-action="toggle-panel" data-panel="journal">x</button></header>
    <div class="journal-body">
      <div class="journal-section">
        <h3>Active Quests</h3>
        ${
          activeQuests.length
            ? activeQuests.map((quest) => `<article><b>${quest.title}</b><span>${activeQuestSummary(quest)}</span></article>`).join('')
            : '<small>No active quests. Talk to townsfolk for leads.</small>'
        }
      </div>
      <div class="journal-section">
        <h3>Discovered Mechanics</h3>
        ${mechanics.map((entry) => `<article><b>${entry.title}</b><span>${entry.text}</span></article>`).join('')}
      </div>
      <div class="journal-section compact">
        <h3>Skills</h3>
        ${relevantSkills
          .map((definition) => {
            const skill = state.player.skills[definition!.id];
            return `<article data-hotbar-source="skill:${attr(definition!.id)}" draggable="true"><b>${definition!.displayName}</b><span>${skill?.value.toFixed(1) ?? '0.0'} · ${definition!.verbs.slice(0, 2).join(', ')}</span></article>`;
          })
          .join('')}
      </div>
      <div class="journal-section compact">
        <h3>Known Locations</h3>
        ${state.world.discoveredAreas.map((areaId) => `<article><b>${areas[areaId].name}</b><span>${areaNotes[areaId] ?? areas[areaId].palette}</span></article>`).join('')}
      </div>
      <div class="journal-section compact">
        <h3>Spells Learned</h3>
        ${spells.map((spell) => `<article data-hotbar-source="spell:${attr(spell.id)}" draggable="true"><b>${spell.displayName}</b><span>Circle ${spell.circle} · Mana ${spell.manaCost}</span></article>`).join('')}
      </div>
      <div class="journal-section compact">
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
      <div class="journal-section compact">
        <h3>Rumors</h3>
        ${
          rumors.length
            ? rumors.map((event) => `<article><b>${event.title}</b><span>${event.rumor}</span></article>`).join('')
            : '<small>No fresh rumors yet. Taverns, market days, and roads will add leads here.</small>'
        }
      </div>
      <div class="journal-section compact">
        <h3>Market And Goals</h3>
        <article><b>Market demand</b><span>${marketUnlocked ? 'Work orders show exact item counts and gold before delivery.' : 'The market board opens after your first gathered or crafted goods.'}</span></article>
        ${goals.map((goal) => `<article><span>${goal}</span></article>`).join('')}
      </div>
    </div>
  </section>`;
}
