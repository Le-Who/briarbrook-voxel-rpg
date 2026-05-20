import type { AttributeName, IconDescriptor, SkillGainMode, SkillId, SkillState } from '../game/types';

export type SkillGroup = 'Barding' | 'Combat' | 'Warrior Specialties' | 'Crafting' | 'Magic' | 'Thieving / Subterfuge' | 'Wilderness';
export type SkillRole = 'active' | 'passive' | 'support' | 'crafting' | 'combat' | 'magic' | 'social' | 'wilderness' | 'thieving';
export type SkillTrainingVerb =
  | 'melee-hit'
  | 'melee-miss'
  | 'ranged-hit'
  | 'ranged-miss'
  | 'take-damage'
  | 'block'
  | 'heal'
  | 'cast-spell'
  | 'resist-spell'
  | 'meditate'
  | 'craft'
  | 'identify'
  | 'harvest-resource'
  | 'fish'
  | 'camp'
  | 'track'
  | 'tame'
  | 'veterinary'
  | 'barding-song'
  | 'trade'
  | 'hide'
  | 'stealth'
  | 'steal'
  | 'lockpick'
  | 'detect'
  | 'trap'
  | 'poison'
  | 'forensics'
  | 'beg';

export interface SkillDefinition {
  id: SkillId;
  displayName: string;
  group: SkillGroup;
  description: string;
  startingValue: number;
  cap: number;
  gainMode: SkillGainMode;
  primaryStat: AttributeName;
  secondaryStat: AttributeName;
  verbs: SkillTrainingVerb[];
  roles: SkillRole[];
  icon: IconDescriptor;
}

const templateStarts: Record<string, number> = {
  Swordsmanship: 35,
  Tactics: 30,
  Anatomy: 20,
  Healing: 25,
  Parrying: 20,
  Magery: 20,
  'Evaluating Intelligence': 10,
  Meditation: 15,
  Mining: 25,
  Lumberjacking: 20,
  Blacksmithing: 20,
  Cooking: 10,
  Focus: 8,
  Archery: 8,
  Camping: 6,
  Survival: 6,
  Tracking: 6,
  Musicianship: 5,
  Alchemy: 5,
  Carpentry: 5,
  Fishing: 5
};

const icon = (shape: IconDescriptor['shape'], primary: string, secondary?: string): IconDescriptor => ({ shape, primary, secondary });
const def = (
  id: string,
  group: SkillGroup,
  description: string,
  primaryStat: AttributeName,
  secondaryStat: AttributeName,
  verbs: SkillTrainingVerb[],
  roles: SkillRole[],
  skillIcon: IconDescriptor,
  startingValue = templateStarts[id] ?? 0
): SkillDefinition => ({
  id,
  displayName: id,
  group,
  description,
  startingValue,
  cap: 100,
  gainMode: 'raise',
  primaryStat,
  secondaryStat,
  verbs,
  roles,
  icon: skillIcon
});

export const skillDefinitions: SkillDefinition[] = [
  def('Musicianship', 'Barding', 'Baseline instrument control for performance and bardic actions.', 'Dexterity', 'Intelligence', ['barding-song'], ['active', 'social', 'support'], icon('bow', '#b77a43', '#f1d58c')),
  def('Peacemaking', 'Barding', 'Calms hostile situations and supports party survival.', 'Intelligence', 'Dexterity', ['barding-song'], ['active', 'social', 'support'], icon('ring', '#6fd4ff', '#f1d58c')),
  def('Provocation', 'Barding', 'Turns enemy pressure against other threats.', 'Intelligence', 'Luck', ['barding-song'], ['active', 'social', 'support'], icon('flame', '#d89435', '#f1d58c')),
  def('Discordance', 'Barding', 'Weakens enemy rhythm, armor, and morale.', 'Intelligence', 'Luck', ['barding-song'], ['active', 'social', 'support'], icon('shield', '#8c4bd6', '#d7c3ff')),

  def('Swordsmanship', 'Combat', 'Accuracy and damage with blades.', 'Strength', 'Dexterity', ['melee-hit', 'melee-miss'], ['active', 'combat'], icon('blade', '#d9d7cf', '#8e6734')),
  def('Fencing', 'Combat', 'Fast thrusting weapons and precise counters.', 'Dexterity', 'Strength', ['melee-hit', 'melee-miss'], ['active', 'combat'], icon('blade', '#cfd7df', '#7c5a35')),
  def('Mace Fighting', 'Combat', 'Heavy blunt weapons and armor-breaking strikes.', 'Strength', 'Constitution', ['melee-hit', 'melee-miss'], ['active', 'combat'], icon('block', '#a9a8a1', '#6b5240')),
  def('Archery', 'Combat', 'Bow accuracy, range control, and projectile damage.', 'Dexterity', 'Strength', ['ranged-hit', 'ranged-miss'], ['active', 'combat'], icon('bow', '#a36b35', '#e7cc8b')),
  def('Wrestling', 'Combat', 'Unarmed control, interrupts, and close pressure.', 'Strength', 'Dexterity', ['melee-hit', 'block'], ['active', 'combat'], icon('bone', '#d8d5c9', '#8d897c')),
  def('Tactics', 'Combat', 'Positioning and damage consistency across weapon styles.', 'Intelligence', 'Strength', ['melee-hit', 'ranged-hit'], ['passive', 'support', 'combat'], icon('shield', '#c7b16a', '#6d4222')),
  def('Anatomy', 'Combat', 'Reading enemy weaknesses and improving weapon results.', 'Intelligence', 'Dexterity', ['melee-hit', 'heal'], ['passive', 'support', 'combat'], icon('potion', '#d7423b', '#f4eeee')),
  def('Parrying', 'Combat', 'Shield blocks and weapon deflections.', 'Dexterity', 'Strength', ['block', 'take-damage'], ['active', 'support', 'combat'], icon('shield', '#a4a8a8', '#875024')),
  def('Healing', 'Combat', 'Bandages, triage, and field recovery.', 'Intelligence', 'Dexterity', ['heal'], ['active', 'support', 'combat'], icon('potion', '#d7423b', '#f4eeee')),
  def('Focus', 'Combat', 'Maintains stamina, concentration, and recovery under pressure.', 'Constitution', 'Intelligence', ['take-damage', 'meditate'], ['passive', 'support', 'combat'], icon('ring', '#6fd4ff', '#5637ff')),

  def('Lightbound Combat', 'Warrior Specialties', 'Faith-flavored martial discipline for protective strikes.', 'Strength', 'Intelligence', ['melee-hit', 'heal'], ['active', 'combat', 'support'], icon('shield', '#d0a449', '#fff1ad')),
  def('Dueling Discipline', 'Warrior Specialties', 'Honor-duel timing, counters, and single-target pressure.', 'Dexterity', 'Intelligence', ['melee-hit', 'block'], ['active', 'combat', 'support'], icon('blade', '#d8d4c7', '#1f5a95')),
  def('Shadow Mobility', 'Warrior Specialties', 'Mobility, evasive movement, and opportunistic strikes.', 'Dexterity', 'Luck', ['stealth', 'melee-hit'], ['active', 'combat', 'thieving'], icon('bag', '#2d2d2a', '#6f7371')),

  def('Alchemy', 'Crafting', 'Potion brewing, reagent refinement, and elixirs.', 'Intelligence', 'Luck', ['craft'], ['active', 'crafting', 'magic'], icon('potion', '#8c4bd6', '#d7c3ff')),
  def('Blacksmithing', 'Crafting', 'Forging metal tools, weapons, armor, and fittings.', 'Strength', 'Intelligence', ['craft'], ['active', 'crafting'], icon('block', '#b7bab7', '#df7930')),
  def('Carpentry', 'Crafting', 'Furniture, housing frames, and timber construction.', 'Strength', 'Dexterity', ['craft'], ['active', 'crafting'], icon('wood', '#8f5f2a', '#5a3517')),
  def('Bowcraft/Fletching', 'Crafting', 'Bows, arrows, shafts, and ranged supplies.', 'Dexterity', 'Intelligence', ['craft'], ['active', 'crafting'], icon('bow', '#a66b2e', '#e1c786')),
  def('Tailoring', 'Crafting', 'Cloth, leather armor, bags, and dyed goods.', 'Dexterity', 'Intelligence', ['craft'], ['active', 'crafting'], icon('scroll', '#8b4f2c', '#c18455')),
  def('Tinkering', 'Crafting', 'Locks, hinges, traps, and small mechanisms.', 'Intelligence', 'Dexterity', ['craft', 'trap'], ['active', 'crafting', 'thieving'], icon('pickaxe', '#c0c2bf', '#7a4b25')),
  def('Inscription', 'Crafting', 'Scroll writing and spellbook preparation.', 'Intelligence', 'Dexterity', ['craft', 'cast-spell'], ['active', 'crafting', 'magic'], icon('scroll', '#d9bd89', '#8a5632')),
  def('Cooking', 'Crafting', 'Meals, provisions, and camp food bonuses.', 'Intelligence', 'Constitution', ['craft'], ['active', 'crafting'], icon('food', '#d27b2f', '#eed19b')),
  def('Cartography', 'Crafting', 'Maps, survey notes, and route discovery.', 'Intelligence', 'Dexterity', ['craft', 'track'], ['active', 'crafting', 'wilderness'], icon('scroll', '#5ba0b8', '#d3edf5')),
  def('Arms Lore', 'Crafting', 'Assessing weapons and armor for durability and quality.', 'Intelligence', 'Strength', ['identify', 'craft'], ['active', 'support', 'crafting'], icon('shield', '#8a8b83', '#5c3922')),
  def('Item Identification', 'Crafting', 'Reveals properties, value, and risks on unusual items.', 'Intelligence', 'Luck', ['identify'], ['active', 'support', 'crafting'], icon('ring', '#d8d2ba', '#ffcf57')),

  def('Magery', 'Magic', 'General spellcasting strength and spell reliability.', 'Intelligence', 'Dexterity', ['cast-spell'], ['active', 'magic'], icon('flame', '#5637ff', '#6fd4ff')),
  def('Evaluating Intelligence', 'Magic', 'Estimates magical force and improves offensive spell outcomes.', 'Intelligence', 'Luck', ['cast-spell', 'identify'], ['passive', 'support', 'magic'], icon('ring', '#6fd4ff', '#ffffff')),
  def('Meditation', 'Magic', 'Mana recovery and focus under pressure.', 'Intelligence', 'Constitution', ['meditate', 'cast-spell'], ['passive', 'support', 'magic'], icon('ring', '#6fd4ff', '#5637ff')),
  def('Resisting Spells', 'Magic', 'Mitigates hostile magic and magical control effects.', 'Constitution', 'Intelligence', ['resist-spell'], ['passive', 'support', 'magic'], icon('shield', '#7197ff', '#dbe7ff')),
  def('Spirit Speak', 'Magic', 'Handles spirits, restless dead, and spectral clues.', 'Intelligence', 'Luck', ['cast-spell'], ['active', 'support', 'magic'], icon('bone', '#c9c5b4', '#6f87d4')),
  def('Dark Rites', 'Magic', 'Dark-magic role for curses, decay, and risk-reward casting.', 'Intelligence', 'Constitution', ['cast-spell'], ['active', 'magic'], icon('bone', '#c9c5b4', '#8c4bd6')),
  def('Arcane Force', 'Magic', 'Force-magic role for direct arcane pressure and shields.', 'Intelligence', 'Strength', ['cast-spell'], ['active', 'magic'], icon('flame', '#6fd4ff', '#ffffff')),
  def('Ritual Weaving', 'Magic', 'Ritual-magic role for delayed effects and group preparation.', 'Intelligence', 'Luck', ['cast-spell'], ['active', 'support', 'magic'], icon('scroll', '#b8a88c', '#f0c957')),

  def('Hiding', 'Thieving / Subterfuge', 'Breaks line of sight and prepares stealth actions.', 'Dexterity', 'Luck', ['hide'], ['active', 'thieving'], icon('bag', '#2d2d2a', '#6f7371')),
  def('Stealth', 'Thieving / Subterfuge', 'Moving unseen and avoiding unwanted fights.', 'Dexterity', 'Luck', ['stealth'], ['active', 'thieving'], icon('bag', '#2d2d2a', '#6f7371')),
  def('Snooping', 'Thieving / Subterfuge', 'Inspects containers and pockets without immediate theft.', 'Dexterity', 'Intelligence', ['steal'], ['active', 'thieving'], icon('bag', '#835026', '#b77a3e')),
  def('Stealing', 'Thieving / Subterfuge', 'Takes unattended or poorly guarded items.', 'Dexterity', 'Luck', ['steal'], ['active', 'thieving'], icon('ring', '#f0c957', '#8f6a39')),
  def('Lockpicking', 'Thieving / Subterfuge', 'Opening chests, doors, and trapped containers.', 'Dexterity', 'Intelligence', ['lockpick'], ['active', 'thieving'], icon('pickaxe', '#d8d4c7', '#8f6a39')),
  def('Detect Hidden', 'Thieving / Subterfuge', 'Finds hidden characters, caches, and suspicious terrain.', 'Intelligence', 'Luck', ['detect'], ['active', 'support', 'thieving'], icon('ring', '#6fd4ff', '#315c2d')),
  def('Remove Trap', 'Thieving / Subterfuge', 'Disarms mechanical hazards and trapped containers.', 'Dexterity', 'Intelligence', ['trap'], ['active', 'thieving'], icon('pickaxe', '#a9a8a1', '#6b5240')),
  def('Poisoning', 'Thieving / Subterfuge', 'Prepares toxins for weapons, traps, and risky alchemy.', 'Intelligence', 'Luck', ['poison', 'craft'], ['active', 'thieving', 'crafting'], icon('potion', '#67c56b', '#315c2d')),
  def('Forensic Evaluation', 'Thieving / Subterfuge', 'Reads corpses, tracks crimes, and identifies recent conflict.', 'Intelligence', 'Luck', ['forensics', 'track'], ['active', 'support', 'thieving'], icon('bone', '#d8d5c9', '#8d897c')),
  def('Begging', 'Thieving / Subterfuge', 'A social fallback for small coin, rumors, and sympathy.', 'Luck', 'Intelligence', ['beg'], ['active', 'social', 'thieving'], icon('food', '#d27b2f', '#eed19b')),

  def('Lumberjacking', 'Wilderness', 'Harvesting logs, branches, bark, and resin.', 'Strength', 'Constitution', ['harvest-resource'], ['active', 'wilderness'], icon('axe', '#c7c9c8', '#815027')),
  def('Mining', 'Wilderness', 'Extracting ore, stone, and rare minerals.', 'Strength', 'Constitution', ['harvest-resource'], ['active', 'wilderness'], icon('pickaxe', '#c0c2bf', '#7a4b25')),
  def('Fishing', 'Wilderness', 'Catching fish and reading water conditions.', 'Dexterity', 'Luck', ['fish'], ['active', 'wilderness'], icon('scroll', '#5ba0b8', '#d3edf5')),
  def('Camping', 'Wilderness', 'Rest points, safe fires, and travel preparation.', 'Constitution', 'Intelligence', ['camp'], ['active', 'wilderness', 'support'], icon('torch', '#ffb13b', '#6b3b1d')),
  def('Survival', 'Wilderness', 'Route safety, hazard sense, camp readiness, and practical field decisions.', 'Constitution', 'Intelligence', ['camp', 'track', 'take-damage'], ['passive', 'support', 'wilderness'], icon('torch', '#8fbd5a', '#f0c957')),
  def('Tracking', 'Wilderness', 'Following footprints, monster signs, and trails.', 'Intelligence', 'Dexterity', ['track'], ['active', 'wilderness'], icon('axe', '#8f5f2a', '#5a3517')),
  def('Animal Lore', 'Wilderness', 'Understands animal behavior and taming difficulty.', 'Intelligence', 'Luck', ['tame', 'veterinary'], ['active', 'support', 'wilderness'], icon('food', '#60a947', '#e8bf4b')),
  def('Animal Taming', 'Wilderness', 'Calms and trains wild creatures.', 'Intelligence', 'Dexterity', ['tame'], ['active', 'wilderness'], icon('ring', '#60a947', '#f1d58c')),
  def('Veterinary', 'Wilderness', 'Heals animals and keeps companions alive.', 'Intelligence', 'Dexterity', ['veterinary'], ['active', 'support', 'wilderness'], icon('potion', '#d7423b', '#f4eeee')),
  def('Herding', 'Wilderness', 'Moves animals and manages packs or livestock.', 'Dexterity', 'Intelligence', ['tame'], ['active', 'wilderness'], icon('shield', '#8f5f2a', '#e1c786'))
];

export const skillDefinitionById = Object.fromEntries(skillDefinitions.map((definition) => [definition.id, definition])) as Record<SkillId, SkillDefinition>;
export const skillGroups: SkillGroup[] = ['Barding', 'Combat', 'Warrior Specialties', 'Crafting', 'Magic', 'Thieving / Subterfuge', 'Wilderness'];
export const skillNames: SkillId[] = skillDefinitions.map((definition) => definition.id);

export function skillsForGroup(group: SkillGroup | 'All'): SkillDefinition[] {
  if (group === 'All') return skillDefinitions;
  return skillDefinitions.filter((definition) => definition.group === group);
}

export function createSkillState(definition: SkillDefinition): SkillState {
  return {
    id: definition.id,
    name: definition.displayName,
    value: definition.startingValue,
    realValue: definition.startingValue,
    bonusValue: 0,
    xp: 0,
    gainProgress: 0,
    cap: definition.cap,
    mode: definition.gainMode,
    lastGainAt: 0,
    lastSuccessfulUseAt: 0,
    ggsTimer: 0
  };
}

export const createInitialSkills = (): Record<SkillId, SkillState> =>
  Object.fromEntries(skillDefinitions.map((definition) => [definition.id, createSkillState(definition)])) as Record<SkillId, SkillState>;
