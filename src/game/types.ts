import type { PerfMonitorSnapshot } from './PerfMonitor';
import type { LoopGovernorSnapshot } from './LoopGovernor';

export type AreaId = 'town' | 'bank' | 'blacksmith' | 'forest' | 'crypt' | 'road' | 'housing';

export type SkillName = string;
export type SkillId = string;
export type SkillGainMode = 'raise' | 'lower' | 'lock';

export type AttributeName = 'Strength' | 'Agility' | 'Dexterity' | 'Intelligence' | 'Constitution' | 'Luck';

export type EquipmentSlot = 'weapon' | 'armor' | 'boots' | 'accessory' | 'backpack' | 'shield' | 'helmet';

export type ItemType =
  | 'weapon'
  | 'armor'
  | 'tool'
  | 'consumable'
  | 'resource'
  | 'misc'
  | 'building'
  | 'container'
  | 'quest';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Vec2 {
  x: number;
  z: number;
}

export type FacingSource = 'movement' | 'target' | 'cast' | 'interact' | 'gathering' | 'idle' | 'forced';

export interface FacingState {
  facingYaw: number;
  desiredFacingYaw: number;
  lastFacingSource: FacingSource;
  facingLockedUntil: number;
  lookAtEntityId: string | null;
  lookAtPosition: Vec3 | null;
}

export type ActionStateKind = 'idle' | 'moving' | 'attacking' | 'casting' | 'gathering' | 'stunned' | 'dead' | 'hidden' | 'interacting' | 'building' | 'transitioning';

export interface ActionState {
  kind: ActionStateKind;
  startedAt: number;
  duration: number;
  endsAt: number;
  interruptible: boolean;
  visualHint: string;
  source?: string;
}

export interface PlayerMovementState {
  velocity: Vec2;
  intent: Vec2 | null;
  intentUntil: number;
  path: Vec3[];
  waypoint: Vec3 | null;
  tile: Vec2;
  maxSpeed: number;
}

export type CombatApproachMode = 'manual' | 'assist' | 'aggressive' | 'melee_only';
export type MovementMode = 'keyboard' | 'mouse' | 'keyboardMouse';

export interface CombatPreferences {
  approachMode: CombatApproachMode;
  autoAttackOnTargetSelect: boolean;
  stopMovementWhenCasting: boolean;
}

export interface QueuedAction {
  id: string;
  actorId: string;
  action: { type: string; [key: string]: unknown };
  createdAt: number;
}

export interface ActionReceipt {
  id: string;
  actorId: string;
  type: string;
  createdAt: number;
  processedAt: number;
}

export interface BufferedAction {
  action: { type: string; [key: string]: unknown };
  target: TargetRef;
  range: number;
  createdAt: number;
  expiresAt: number;
  label: string;
}

export interface TimedStatusEffect {
  id: string;
  type: 'stun' | 'hidden' | 'meditation' | 'poison' | 'protection' | 'strength' | 'custom';
  targetId: string;
  startedAt: number;
  duration: number;
  endsAt: number;
  amount?: number;
}

export interface RealtimeState {
  tickRate: number;
  fixedDelta: number;
  renderAlpha: number;
  tick: number;
  lastFrameDelta: number;
  actionQueue: QueuedAction[];
  actionHistory: ActionReceipt[];
  pendingAction: BufferedAction | null;
  statusEffects: Record<string, TimedStatusEffect[]>;
}

export interface Attributes {
  Strength: number;
  Agility: number;
  Dexterity: number;
  Intelligence: number;
  Constitution: number;
  Luck: number;
}

export interface DerivedStats {
  maxHealth: number;
  maxMana: number;
  maxStamina: number;
  minDamage: number;
  maxDamage: number;
  attackSpeed: number;
  armor: number;
  magicResist: number;
  critChance: number;
  dodgeChance: number;
  carryCapacity: number;
}

export interface SkillState {
  id: SkillId;
  name: string;
  value: number;
  realValue: number;
  bonusValue: number;
  xp: number;
  gainProgress: number;
  cap: number;
  mode: SkillGainMode;
  lastGainAt: number;
  lastSuccessfulUseAt: number;
  ggsTimer: number;
}

export interface IconDescriptor {
  shape: 'blade' | 'bow' | 'flame' | 'potion' | 'scroll' | 'pickaxe' | 'axe' | 'block' | 'torch' | 'bag' | 'food' | 'ore' | 'armor' | 'ring' | 'shield' | 'bone' | 'wood';
  primary: string;
  secondary?: string;
}

export interface ItemDef {
  id: string;
  name: string;
  type: ItemType;
  stackable: boolean;
  maxStack: number;
  weight: number;
  value: number;
  icon: IconDescriptor;
  equipmentSlot?: EquipmentSlot;
  statModifiers?: Partial<Attributes> & Partial<DerivedStats>;
  useEffect?: 'heal' | 'mana' | 'stamina' | 'food' | 'cure';
  power?: number;
  range?: number;
  buildPieceId?: string;
  weaponClass?: 'sword' | 'fencing' | 'mace' | 'axe' | 'bow' | 'crossbow' | 'unarmed' | 'staff';
  visualPrefabId?: string;
  baseDamageMin?: number;
  baseDamageMax?: number;
  swingSpeed?: number;
  staminaCost?: number;
  requiredAmmo?: string;
  twoHanded?: boolean;
  durability?: number;
  specialMoves?: string[];
  skillUsed?: SkillId;
  supportSkill?: SkillId;
}

export interface ItemStack {
  uid: string;
  itemId: string;
  quantity: number;
  durability?: number;
  maxDurability?: number;
  poisonCharges?: number;
  poisonPotency?: number;
  quality?: 'crude' | 'normal' | 'exceptional';
  makerName?: string;
  materialType?: string;
  exceptional?: boolean;
  trait?: string;
  statModifiers?: Partial<Attributes> & Partial<DerivedStats>;
}

export interface InventoryState {
  slots: Array<ItemStack | null>;
  capacity: number;
}

export interface EquipmentState {
  weapon?: ItemStack;
  armor?: ItemStack;
  boots?: ItemStack;
  accessory?: ItemStack;
  backpack?: ItemStack;
  shield?: ItemStack;
  helmet?: ItemStack;
}

export type ZoneType = 'guarded_town' | 'private_interior' | 'public_interior' | 'wilderness' | 'dungeon' | 'player_plot' | 'safe_area' | 'future_risk';

export type ReputationStatus = 'lawful' | 'neutral' | 'suspicious' | 'criminal' | 'outlaw';

export type CriminalActionType = 'snoop' | 'steal' | 'attack_innocent' | 'pick_owned_lock' | 'trespass' | 'loot_protected';

export interface ReputationState {
  status: ReputationStatus;
  townStanding: number;
  fame: number;
  karma: number;
  recentCriminalUntil: number;
  aggressionCount: number;
  murderCount: number;
  finesOwed: number;
  warningAcknowledged: Partial<Record<CriminalActionType, boolean>>;
  lastCrimeAt: number;
}

export interface ZoneRuleDefinition {
  id: ZoneType;
  label: string;
  riskLabel: string;
  canAttackPlayers: boolean;
  canAttackNPCs: boolean;
  canSteal: boolean;
  guardResponse: 'none' | 'warning' | 'fine' | 'guarded' | 'hostile';
  reputationImpact: number;
  lootRules: 'protected' | 'normal' | 'dungeon' | 'future_full_loot_disabled';
  trespassRules: 'none' | 'warn' | 'crime';
  summonHelpRules: 'none' | 'npc_shout' | 'guard_horn';
}

export interface CrimeEventState {
  id: string;
  type: CriminalActionType;
  area: AreaId;
  targetId?: string;
  detected: boolean;
  witnessIds: string[];
  severity: 'minor' | 'major';
  createdAt: number;
  reputationStatus: ReputationStatus;
}

export interface PlayerState {
  id: 'player';
  name: string;
  level: number;
  xp: number;
  xpToNext: number;
  health: number;
  mana: number;
  stamina: number;
  attributes: Attributes;
  statModes: Record<AttributeName, SkillGainMode>;
  skills: Record<SkillId, SkillState>;
  skillCap: number;
  selectedSkillGroup: string;
  customSkillGroups?: Record<string, SkillId[]>;
  inventory: InventoryState;
  bank: InventoryState;
  equipment: EquipmentState;
  gold: number;
  bankGold: number;
  position: Vec3;
  movement: PlayerMovementState;
  facing: FacingState;
  combatPreferences: CombatPreferences;
  actionState: ActionState;
  targetPosition: Vec3 | null;
  currentArea: AreaId;
  activeTargetId: string | null;
  activeQuestIds: string[];
  completedQuestIds: string[];
  spellbook: {
    itemId: string;
    knownSpellIds: string[];
  };
  combatProfile: {
    hidden: boolean;
    hiddenUntil: number;
    poison: PoisonState | null;
    bardCooldowns: Record<string, number>;
    lastStealthCheckAt: number;
  };
  reputation: ReputationState;
  downed: {
    active: boolean;
    since: number;
    respawnAt: number;
  };
}

export type EntityKind = 'npc' | 'social' | 'enemy' | 'resource' | 'loot' | 'container' | 'building' | 'portal';

export interface BaseEntity {
  id: string;
  kind: EntityKind;
  area: AreaId;
  name: string;
  position: Vec3;
  blocksMovement: boolean;
  facing?: FacingState;
  actionState?: ActionState;
}

export interface NpcEntity extends BaseEntity {
  kind: 'npc' | 'social';
  role: 'banker' | 'blacksmith' | 'merchant' | 'guard' | 'player' | 'quest';
  dialogue: string[];
  tradeInventory?: InventoryState;
  tradeGold?: number;
  craftStation?: StationType;
  training?: TrainingOffer[];
  serviceAvailable?: boolean;
  scheduleState?: {
    scheduleId: string;
    behavior: string;
    available: boolean;
    lastAppliedAt: number;
  };
}

export interface EnemyEntity extends BaseEntity {
  kind: 'enemy';
  enemyType: 'Undead' | 'Bandit' | 'Beast' | 'Cultist';
  level: number;
  health: number;
  maxHealth: number;
  damage: [number, number];
  armor: number;
  magicResist: number;
  poisonResist: number;
  weaponSkill: number;
  defenseSkill: number;
  aiStyle: 'melee' | 'archer' | 'mage' | 'beast';
  combatRole: 'grunt' | 'archer' | 'caster' | 'brute' | 'skirmisher' | 'summoner' | 'support';
  aggroRadius: number;
  attackRange: number;
  attackCooldown: number;
  attackTimer: number;
  patrolTimer: number;
  leashOrigin: Vec3;
  state: 'idle' | 'patrol' | 'chase' | 'attack' | 'return' | 'dead';
  poison: PoisonState | null;
  pacifiedUntil: number;
  discordUntil: number;
  discordAmount: number;
  provokedTargetId: string | null;
  lootTable: Array<{ itemId: string; min: number; max: number; chance: number }>;
  goldDrop: [number, number];
}

export interface ResourceNodeEntity extends BaseEntity {
  kind: 'resource';
  resourceId: string;
  resourceType: 'tree' | 'ore' | 'fish' | 'herb';
  classification?: TreeResourceClassification;
  protected?: boolean;
  visualVariant?: number;
  toolItemId: string;
  skill: SkillName;
  yieldItemId: string;
  yieldRange: [number, number];
  baseDuration: number;
  respawnSeconds: number;
  inspectText: string;
  depleted: boolean;
  respawnTimer: number;
}

export interface GatheringState {
  entityId: string;
  actionLabel: string;
  startedAt: number;
  duration: number;
  remaining: number;
}

export interface LootEntity extends BaseEntity {
  kind: 'loot';
  item?: ItemStack;
  gold?: number;
  expiresIn: number;
}

export interface ContainerEntity extends BaseEntity {
  kind: 'container';
  locked: boolean;
  opened: boolean;
  hidden: boolean;
  protected?: boolean;
  ownerId?: string;
  accessRule?: 'public' | 'private' | 'abandoned' | 'player_owned';
  lockDifficulty: number;
  trap: {
    armed: boolean;
    detected: boolean;
    difficulty: number;
    damage: number;
  } | null;
  loot: RecipeRequirement[];
  gold: number;
  requiredSpellId?: string;
}

export interface BuildingEntity extends BaseEntity {
  kind: 'building';
  pieceId: string;
  rotation: number;
  ownerId?: PlayerState['id'];
  plotId?: string;
  storageId?: string;
  functionType?: HousingFunctionType;
  placedAt?: number;
}

export interface PortalEntity extends BaseEntity {
  kind: 'portal';
  destination: AreaId;
  spawn?: Vec3;
}

export type Entity = NpcEntity | EnemyEntity | ResourceNodeEntity | LootEntity | ContainerEntity | BuildingEntity | PortalEntity;

export interface RecipeRequirement {
  itemId: string;
  quantity: number;
}

export interface RecipeOutput {
  itemId: string;
  quantity: number;
  materialType?: string;
}

export interface TreasureMapDefinition {
  id: string;
  tier: number;
  regionHint: AreaId;
  clueText: string;
  approximateCoordinate: Vec3;
  approximateLocation: Vec3;
  requiredCartography: number;
  cartographyDifficulty: number;
  digRadius: number;
  searchRadius: number;
  requiredTool: string;
  possibleEncounters: EnemyEntity['enemyType'][];
  lootTableId: string;
  hiddenModifiers: string[];
  persistentStateKey: string;
}

export interface SecretDefinition {
  id: string;
  areaId: AreaId;
  location: Vec3;
  triggerType: 'detect_hidden' | 'reveal' | 'lever' | 'pressure_plate' | 'spell' | 'excavate';
  revealMethods: Array<'detect_hidden' | 'reveal' | 'detect_magic' | 'lever' | 'pressure_plate' | 'spell' | 'excavate'>;
  requiredSkill: SkillId;
  difficulty: number;
  revealDuration: number;
  revealedState: 'hidden_cache' | 'trap_warning' | 'sealed_alcove' | 'pressure_plate' | 'treasure_room';
  revealedEntityId?: string;
  reward: RecipeRequirement[];
  danger: 'none' | 'trap' | 'ambush' | 'poison' | 'alarm';
  persistenceKey: string;
  persistentStateKey: string;
}

export interface LockDefinition {
  difficulty: number;
  lockType: 'simple' | 'warded' | 'ancient' | 'puzzle';
  requiredTool: string;
  breakChance: number;
  retryCooldown: number;
  alarmChance: number;
}

export interface TrapDefinition {
  trapType: 'dart' | 'poison_dart' | 'alarm' | 'summon' | 'magic_burst';
  detectionDifficulty: number;
  disarmDifficulty: number;
  damageOrEffect: number;
  triggerShape: 'self' | 'tile' | 'radius';
  resetPolicy: 'never' | 'cooldown' | 'area_reset';
}

export type StationType = 'forge' | 'carpentry' | 'fletching' | 'alchemy' | 'scribe' | 'tailor' | 'cooking' | 'tinkering';

export interface TrainingOffer {
  skillId: SkillId;
  maxSkill: number;
  costPerPoint: number;
}

export type ResourceKind = 'tree' | 'ore' | 'water' | 'herb';

export type TreeResourceClassification =
  | 'harvestableTree'
  | 'protectedTownTree'
  | 'decorativeTinyShrub'
  | 'stumpDepletedTree'
  | 'questTree'
  | 'collisionOnlyProp';

export interface ResourceYieldEntry {
  itemId: string;
  min: number;
  max: number;
  chance: number;
  minSkill?: number;
}

export interface ResourceTile {
  areaId: AreaId;
  x: number;
  z: number;
  resourceKind: ResourceKind;
  name: string;
  classification?: TreeResourceClassification;
  protected?: boolean;
  tileId?: string;
  entityId?: string;
  visualState?: 'standing' | 'stump' | 'depleted';
  depletedUntil: number;
  currentYieldTable: ResourceYieldEntry[];
  hiddenQuality: number;
  lastHarvestedAt: number;
  visualVariant: number;
  difficulty: number;
  harvestsRemaining: number;
  maxHarvests: number;
}

export interface Recipe {
  id: string;
  name: string;
  stationType: StationType;
  minSkill: number;
  difficulty: number;
  inputs: RecipeRequirement[];
  outputs: RecipeOutput[];
  exceptionalChance: number;
  qualityTier: 'basic' | 'standard' | 'fine';
  failureMode: 'consume' | 'partial-refund' | 'none';
  toolRequired?: string;
  outputItemId: string;
  outputQuantity: number;
  level: number;
  duration: number;
  requirements: RecipeRequirement[];
  skill: SkillName;
}

export interface CraftJob {
  id: string;
  recipeId: string;
  quantity: number;
  remaining: number;
  total: number;
}

export interface BuildPieceDef {
  id: string;
  name: string;
  category: 'Walls' | 'Floors' | 'Fences' | 'Doors' | 'Roofs' | 'Storage' | 'Crafting' | 'Utility' | 'Decor' | 'Garden' | 'Trophies';
  description: string;
  cost: RecipeRequirement[];
  size: Vec2;
  blocksMovement: boolean;
  icon: IconDescriptor;
}

export interface QuestObjective {
  type:
    | 'collect'
    | 'kill'
    | 'deliver'
    | 'talk'
    | 'open_panel'
    | 'gather'
    | 'craft'
    | 'buy'
    | 'cast'
    | 'meditate'
    | 'bandage'
    | 'bank'
    | 'enter_area'
    | 'build'
    | 'loot'
    | 'open_container'
    | 'bard';
  label: string;
  itemId?: string;
  enemyName?: string;
  npcName?: string;
  panel?: string;
  skillId?: string;
  recipeId?: string;
  spellId?: string;
  containerId?: string;
  areaId?: AreaId;
  required: number;
  progress: number;
}

export interface QuestState {
  id: string;
  title: string;
  giver: string;
  description: string;
  objectives: QuestObjective[];
  rewards: { gold: number; xp: number; items?: RecipeRequirement[] };
  status: 'active' | 'ready' | 'complete';
}

export interface ChatMessage {
  id: string;
  channel: 'Local' | 'Global' | 'Party' | 'Guild' | 'System' | 'Rumors';
  speaker?: string;
  text: string;
  tone?: 'normal' | 'system' | 'trade' | 'party' | 'danger';
  createdAt: number;
}

export interface FloatingText {
  id: string;
  text: string;
  position: Vec3;
  color: string;
  age: number;
  lifetime: number;
}

export interface Projectile {
  id: string;
  kind: 'arrow' | 'firebolt' | 'magic_arrow' | 'fireball' | 'lightning' | 'poison' | 'heal';
  from: Vec3;
  to: Vec3;
  age: number;
  duration: number;
  color: string;
}

export type VisualEffectTier = 0 | 1 | 2 | 3;

export type VisualEffectKind =
  | 'slash_arc'
  | 'pierce_thrust'
  | 'mace_impact'
  | 'shield_block'
  | 'dodge_cue'
  | 'miss_cue'
  | 'crit_cue'
  | 'armor_sparks'
  | 'hit_impact'
  | 'wood_chips'
  | 'ore_sparks'
  | 'water_ripple'
  | 'herb_sparkle'
  | 'depleted_cue'
  | 'heal_particles'
  | 'buff_ring'
  | 'debuff_mark'
  | 'utility_line'
  | 'reveal_pulse'
  | 'rune_circle'
  | 'fizzle_smoke'
  | 'pickup_gesture'
  | 'interact_gesture'
  | 'craft_loop';

export interface VisualEffect {
  id: string;
  kind: VisualEffectKind;
  tier: VisualEffectTier;
  area: AreaId;
  position: Vec3;
  targetPosition?: Vec3;
  yaw?: number;
  color: string;
  startedAt: number;
  duration: number;
  intensity?: number;
}

export interface TradeState {
  partnerId: string;
  playerSlots: Array<ItemStack | null>;
  partnerSlots: Array<ItemStack | null>;
  playerGold: number;
  partnerGold: number;
  playerLocked: boolean;
  partnerLocked: boolean;
}

export type TargetRef =
  | { kind: 'entity'; entityId: string }
  | { kind: 'tile'; areaId: AreaId; position: Vec3 }
  | { kind: 'inventory'; owner: 'inventory' | 'bank' | 'trade-player'; slot: number }
  | { kind: 'ground-item'; entityId: string }
  | { kind: 'self' }
  | { kind: 'friendly'; entityId: string }
  | { kind: 'hostile'; entityId: string }
  | null;

export interface TargetingState {
  mode: 'tool' | 'skill' | 'spell';
  prompt: string;
  toolItemId?: string;
  skillId?: SkillId;
  spellId?: string;
}

export interface ContextMenuState {
  target: TargetRef;
  x: number;
  y: number;
}

export interface MerchantState {
  partnerId: string;
}

export interface BuildModeState {
  active: boolean;
  selectedPieceId: string;
  rotation: number;
  snapToGrid: boolean;
  ghostPosition: Vec3;
  valid: boolean;
  message: string;
  moveBuildingId: string | null;
}

export type HousingTier = 0 | 1 | 2 | 3;

export type HousingFunctionType = 'storage' | 'crafting' | 'utility' | 'decor' | 'boundary' | 'garden' | 'trophy';

export interface HousingStorageState {
  id: string;
  buildingId: string;
  name: string;
  inventory: InventoryState;
  acceptedItemTypes?: ItemType[];
  acceptedItemIds?: string[];
  maxWeight: number;
  upgradeLevel: number;
}

export interface HousingGardenState {
  buildingId: string;
  yieldItemId: string;
  quantity: number;
  readyAt: number;
  cooldown: number;
}

export interface HousingPlotState {
  id: string;
  name: string;
  ownerId: PlayerState['id'] | null;
  tier: HousingTier;
  claimedAt: number | null;
  boundary: { minX: number; maxX: number; minZ: number; maxZ: number };
  permissions: {
    ownerCanBuild: boolean;
  };
  lastPlacementId: string | null;
  homeAnchor: Vec3 | null;
}

export interface HousingState {
  ownedPlotId: string | null;
  plots: Record<string, HousingPlotState>;
  storages: Record<string, HousingStorageState>;
  gardens: Record<string, HousingGardenState>;
  lastRestedAt: number;
}

export interface CombatState {
  meleeCooldown: number;
  rangedCooldown: number;
  magicCooldown: number;
  abilityCooldowns: Record<string, number>;
  defenseUntil: number;
  riposteUntil: number;
  lastAttackAt: number;
  lastDamagedAt: number;
  hitFlashes: Record<string, number>;
  telegraphs: CombatTelegraph[];
}

export interface CombatTelegraph {
  id: string;
  sourceId: string;
  kind: 'slash' | 'cone' | 'shot' | 'cast' | 'leap';
  area: AreaId;
  origin: Vec3;
  targetPosition: Vec3;
  startedAt: number;
  duration: number;
  remaining: number;
  radius: number;
  color: string;
}

export interface PoisonState {
  sourceId: string;
  potency: number;
  tickTimer: number;
  remaining: number;
}

export interface BandageState {
  target: TargetRef;
  startedAt: number;
  duration: number;
  remaining: number;
  interrupted: boolean;
}

export interface SpellCastingState {
  id: string;
  spellId: string;
  target: TargetRef;
  remaining: number;
  total: number;
}

export interface SpellEffectState {
  id: string;
  type: 'night_sight' | 'protection' | 'strength' | 'poison' | 'curse' | 'stone_wall' | 'meditation' | 'detect_magic' | 'reveal' | 'water_walk' | 'mark_rune';
  targetId?: string;
  buildingId?: string;
  remaining: number;
  amount: number;
}

export interface MagicField {
  id: string;
  kind: 'trap' | 'bridge' | 'marked_rune';
  area: AreaId;
  position: Vec3;
  createdAt: number;
  remaining: number;
  power: number;
}

export type WorldPhase = 'dawn' | 'day' | 'dusk' | 'night';

export interface WorldTimeState {
  dayLengthSeconds: number;
  day: number;
  timeOfDay: number;
  hour: number;
  minute: number;
  phase: WorldPhase;
  visibilityModifier: number;
  stealthModifier: number;
}

export type WorldEventType = 'bandit_ambush' | 'merchant_caravan' | 'crypt_spill' | 'lost_traveler' | 'rare_ore' | 'market_day' | 'storm';

export interface WorldEventState {
  id: string;
  type: WorldEventType;
  title: string;
  area: AreaId;
  startedAt: number;
  endsAt: number;
  discovered: boolean;
  rumor: string;
  position?: Vec3;
  spawnedEntityIds: string[];
}

export interface ResourcePressureState {
  harvests: number;
  lastHarvestedAt: number;
  yieldModifier: number;
}

export type EconomyOrderCategory = 'metal' | 'wood' | 'healing' | 'reagents' | 'food' | 'combat' | 'banking' | 'building' | 'treasure' | 'housing' | 'misc';

export interface WorkOrderState {
  id: string;
  issuerNpcId?: string;
  requester: string;
  category?: EconomyOrderCategory;
  title?: string;
  description?: string;
  itemId: string;
  quantity: number;
  requiredItems?: RecipeRequirement[];
  requiredQuality?: ItemStack['quality'];
  rewardItems?: RecipeRequirement[];
  rewardSkillHints?: SkillId[];
  reputationGain?: number;
  delivered: number;
  rewardGold: number;
  skill: SkillId;
  expiresAt: number;
  expiresAtWorldTime?: number;
  repeatPolicy?: 'daily' | 'weekly' | 'once' | 'rotating';
  difficultyTier?: number;
  status: 'open' | 'complete' | 'expired';
}

export interface MarketOrderState {
  id: string;
  kind: 'buy' | 'sell';
  poster: string;
  issuerId?: string;
  source?: 'npc' | 'simulated_player' | 'player';
  category?: EconomyOrderCategory;
  itemId: string;
  quantity: number;
  unitPrice: number;
  expiresAt: number;
  quality?: ItemStack['quality'];
  condition?: number;
  demandMultiplier?: number;
  status: 'open' | 'filled' | 'expired';
}

export interface EconomyTransactionState {
  id: string;
  kind: 'market' | 'work_order' | 'repair' | 'tax';
  category?: EconomyOrderCategory;
  itemId?: string;
  quantity?: number;
  gold: number;
  actor: string;
  createdAt: number;
}

export interface EconomyState {
  workOrders: WorkOrderState[];
  marketOrders: MarketOrderState[];
  transactionLog: EconomyTransactionState[];
  lastDailySeed: number;
  localDemand: Partial<Record<EconomyOrderCategory | string, number>>;
  priceTrends: Record<string, number[]>;
}

export interface TreasureMapRuntimeState {
  fragmentCount: number;
  decipheredPrecision: number;
  found: boolean;
  pinned: boolean;
  lastCheckedAt: number;
}

export interface SecretRuntimeState {
  revealedUntil: number;
  disarmed: boolean;
  triggered: boolean;
  opened: boolean;
}

export interface TreasureState {
  maps: Record<string, TreasureMapRuntimeState>;
  secrets: Record<string, SecretRuntimeState>;
  excavationCooldowns: Record<string, number>;
}

export interface ContentValidationState {
  ok: boolean;
  errors: string[];
  warnings: string[];
  checkedAt: number;
}

export interface TelemetryState {
  startedAt: number;
  firstHourPathCompletionTime: number | null;
  playtest: PlaytestTelemetryState;
  damageDealtBySource: Record<string, number>;
  damageTaken: number;
  skillEvents: Record<SkillId, number>;
  skillGains: Record<SkillId, number>;
  resourceYields: Record<string, number>;
  resourceOutflow: Record<string, number>;
  itemsSold: Record<string, number>;
  itemsConsumed: Record<string, number>;
  bandagesApplied: number;
  combatBandagesApplied: number;
  repairsCompleted: number;
  workOrdersCompleted: number;
  marketTransactions: number;
  goldEarned: number;
  goldSpent: number;
  potionConsumption: Record<string, number>;
  deathCount: number;
  stuckRecoveryEvents: number;
  transitionFallbacks: number;
  tooltipRemounts: number;
  uiResetUsage: number;
  actionCancellations: Record<string, number>;
  questCompletionTime: Record<string, number>;
  priceTrends: Record<string, number[]>;
}

export interface PlaytestTelemetryState {
  timeToFirstMovement: number | null;
  timeToFirstSuccessfulInteraction: number | null;
  timeToIdentifyEquippedItem: number | null;
  timeToAssignHotbar: number | null;
  invalidActionCount: number;
  tooltipRelianceCount: number;
  windowsOpened: Record<string, number>;
  objectiveCompletions: Record<string, number>;
}

export interface RenderBudgetState {
  roughDrawCalls: number;
  meshCount: number;
  visibleEntityCount: number;
  raycastCandidateCount: number;
  triangles: number;
  estimatedFrameMs: number;
  memoryAfterTransitionMb: number;
  domNodeCount: number;
  visibleWindowCount: number;
  cachedIconCount: number;
  eventListenerCount: number;
}

export interface RenderStatsState {
  frame: number;
  fps: number;
  frameTimeMs: number;
  entityCount: number;
  visibleEntityCount: number;
  roughDrawCalls: number;
  triangles: number;
  meshCount: number;
  staticMeshCount: number;
  entityMeshCount: number;
  effectMeshCount: number;
  instancedMeshCount: number;
  instancedInstanceCount: number;
  materialCount: number;
  geometryCount: number;
  raycastCandidateCount: number;
  estimatedFrameMs: number;
  memoryAfterTransitionMb: number | null;
  domNodeCount: number;
  visibleWindowCount: number;
  iconRenderRequestCount: number;
  cachedIconCount: number;
  eventListenerCount: number;
  budget: RenderBudgetState;
  perf: PerfMonitorSnapshot;
  loop: LoopGovernorSnapshot;
}

export type InputMode = 'normal' | 'uiDragging' | 'itemDragging' | 'spellDragging' | 'targeting' | 'building' | 'chatFocused' | 'modalOpen' | 'paused' | 'devOverlay';
export type InputBindingContext = 'gameplay' | 'ui' | 'debug';
export type InputActionId =
  | 'moveUp'
  | 'moveDown'
  | 'moveLeft'
  | 'moveRight'
  | 'interact'
  | 'cancel'
  | 'primaryAction'
  | 'secondaryAction'
  | 'targetNext'
  | 'openInventory'
  | 'openSkills'
  | 'openSpellbook'
  | 'openJournal'
  | 'openMarket'
  | 'openBuild'
  | 'openCharacter'
  | 'openHelp'
  | 'openCrafting'
  | 'openContextMenu'
  | 'confirm'
  | 'back'
  | 'toggleCursorCamera'
  | 'hotbar1'
  | 'hotbar2'
  | 'hotbar3'
  | 'hotbar4'
  | 'hotbar5'
  | 'hotbar6'
  | 'hotbar7'
  | 'hotbar8'
  | 'hotbar9'
  | 'hotbar10'
  | 'hotbarPrevious'
  | 'hotbarNext'
  | 'defend'
  | 'weaponAbility'
  | 'cancelBuild'
  | 'buildSnap'
  | 'rotateBuildLeft'
  | 'rotateBuildRight'
  | 'openDevTravel'
  | 'toggleDevOverlay';

export interface InputBindingState {
  actionId: InputActionId;
  label: string;
  context: InputBindingContext;
  keys: string[];
  custom?: boolean;
  locked?: boolean;
}

export interface KeybindingCaptureState {
  actionId: InputActionId;
  context: InputBindingContext;
}

export interface InputDebugState {
  mode: InputMode;
  lastRawInput: string;
  lastIntent: string;
  focusedWindow: string;
  focusedElement: string;
  topmostWindow: string;
  dragPayload: string | null;
  pointerCapture: string | null;
  lastPreventedDefault: string;
  targetMode: string | null;
  viewport: string;
  uiScale: number;
}

export interface DevStabilityState {
  lastMovementCommandAt: number;
  lastMovementCommandSource: string;
  lastActionCancellationReason: string;
  currentPortalId: string | null;
  lastTransition: {
    from: AreaId;
    to: AreaId;
    portalId: string | null;
    requested: Vec3;
    resolved: Vec3;
    usedFallback: boolean;
    at: number;
  } | null;
  safeSpawnFallbackCount: number;
}

export interface DevToolState {
  overlay: boolean;
  selectedSceneId: string;
  contentValidation: ContentValidationState;
  telemetry: TelemetryState;
  telemetryExportJson: string;
  renderStats: RenderStatsState;
  input: InputDebugState;
  stability: DevStabilityState;
  facingDebug: {
    showFacingArrows: boolean;
    showDesiredFacingArrows: boolean;
    showVelocityVectors: boolean;
    showLookAtLines: boolean;
  };
}

export type HotbarBinding =
  | { kind: 'action'; id: 'attack' | 'ranged' | 'utility' | 'hide' | 'defend' | 'interact' | 'build' }
  | { kind: 'item'; id: string }
  | { kind: 'tool'; id: string }
  | { kind: 'spell'; id: string }
  | { kind: 'skill'; id: string };

export interface UIState {
  panels: Record<string, boolean>;
  selectedInventorySlot: number | null;
  selectedBankSlot: number | null;
  hoverTarget: TargetRef;
  selectedTarget: TargetRef;
  targeting: TargetingState | null;
  contextMenu: ContextMenuState | null;
  selectedRecipeId: string;
  selectedTreasureMapId: string;
  selectedHousingStorageId: string | null;
  selectedStationType: StationType | 'all';
  selectedSpellId: string;
  spellSearch: string;
  spellbookCircle: number | 'all';
  spellbookFilter: 'known' | 'all' | 'unknown';
  spellbookView: 'grid' | 'list';
  journalTab: 'quests' | 'rumors' | 'skills' | 'spells' | 'locations' | 'tutorials' | 'workOrders';
  skillSearch: string;
  skillView: 'ledger' | 'atlas' | 'mastery';
  professionFilter: string;
  spellbookSearch: string;
  spellbookKnowledgeFilter: SpellbookKnowledgeFilter;
  spellbookCircleFilter: number | 'all';
  spellbookRoleFilter: SpellbookRoleFilter;
  spellbookViewMode: SpellbookViewMode;
  hotbarAssignSpellId: string | null;
  skillsViewMode: SkillsViewMode;
  skillTrainableFilter: SkillTrainableFilter;
  skillRecentFilter: SkillRecentFilter;
  skillProfessionFilter: ProfessionLensFilter;
  professionAtlasZoom: number;
  professionAtlasSearch: string;
  selectedProfessionNodeId: string | null;
  pinnedProfessionGoalId: string | null;
  pinnedRumorId: string | null;
  mapWaypoint: MapWaypointState | null;
  minimapMode: MinimapMode;
  mapHiddenLayers: MapLayerId[];
  devTravel: boolean;
  fadeUntil: number;
  craftQuantity: number;
  selectedBuildCategory: BuildPieceDef['category'];
  marketCategory: EconomyOrderCategory | 'all';
  marketView: MarketViewMode;
  marketSearch: string;
  chatTab: ChatMessage['channel'];
  chatMode: ChatPanelMode;
  chatHiddenChannels: ChatMessage['channel'][];
  chatOpacity: number;
  chatMessageRetention: number;
  activeHotbarSlot: number;
  hotbar: Array<HotbarBinding | null>;
  uiScale: number;
  fontScale: number;
  tooltipDelayMs: number;
  tooltipMode: TooltipDetailMode;
  advancedTooltipModifier: AdvancedTooltipModifier;
  reducedMotion: boolean;
  colorblindStatusColors: boolean;
  showDamageNumbers: boolean;
  showSkillGainToasts: boolean;
  showChatTabs: boolean;
  audio: AudioSettingsState;
  lockUILayout: boolean;
  hudDensity: HudDensityMode;
  movementMode: MovementMode;
  inputBindings: InputBindingState[];
  keybindingCapture: KeybindingCaptureState | null;
  cameraSmoothing: CameraSmoothingMode;
  cameraRelativeMovement: boolean;
  windowLayouts: Partial<Record<ManagedWindowId, UIWindowLayout>>;
  windowLayoutPreset: UILayoutPreset;
  windowFocusOrder: ManagedWindowId[];
  prompt: string;
  trade: TradeState | null;
  merchant: MerchantState | null;
}

export type MapWaypointSource = 'manual' | 'objective' | 'rumor' | 'treasure';
export interface MapWaypointState {
  areaId: AreaId;
  position: Vec3;
  label: string;
  source: MapWaypointSource;
  setAt: number;
}
export type CameraSmoothingMode = 'low' | 'medium' | 'high';
export type AudioVolumeCategory = 'master' | 'music' | 'sfx' | 'ui' | 'ambient' | 'combatAlert';
export interface AudioSettingsState {
  volumes: Record<AudioVolumeCategory, number>;
  muteWhenUnfocused: boolean;
  visualAudioCues: boolean;
}
export type TooltipDetailMode = 'compact' | 'advanced';
export type AdvancedTooltipModifier = 'shift' | 'alt' | 'ctrl';
export type HudDensityMode = 'normal' | 'compact' | 'minimal';
export type ChatPanelMode = 'expanded' | 'compact' | 'collapsed' | 'combatHidden';
export type MinimapMode = 'compact' | 'standard' | 'expanded' | 'hidden';
export type MapLayerId = 'terrain' | 'player' | 'companions' | 'services' | 'objective' | 'pinned' | 'danger' | 'entrances' | 'housing';
export type SpellbookKnowledgeFilter = 'known' | 'all' | 'unknown';
export type SpellbookViewMode = 'grid' | 'list' | 'circle';
export type SpellbookRoleFilter = 'all' | 'Damage' | 'Healing' | 'Utility' | 'Control' | 'Travel' | 'Buff' | 'Debuff';
export type MarketViewMode = 'work' | 'trade' | 'all';
export type SkillsViewMode = 'ledger' | 'atlas' | 'milestones';
export type SkillTrainableFilter = 'all' | 'trainable' | 'not_trainable';
export type SkillRecentFilter = 'all' | 'recent';
export type ProfessionLensFilter =
  | 'all'
  | 'ranger'
  | 'hedge_mage'
  | 'treasure_hunter'
  | 'field_medic'
  | 'town_smith'
  | 'builder'
  | 'bard'
  | 'rogue'
  | 'provisioner'
  | 'battle_miner';
export type ManagedWindowId = 'inventory' | 'spellbook' | 'skills' | 'journal' | 'market' | 'help' | 'chat' | 'map';
export type UILayoutPreset = 'default' | 'compact' | 'large' | 'combat' | 'crafting' | 'exploration' | 'stream';
export interface UIWindowLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WorldState {
  placedBuildings: BuildingEntity[];
  housing: HousingState;
  discoveredAreas: AreaId[];
  resourceTiles: Record<string, ResourceTile>;
  magicFields: MagicField[];
  recallMark: { area: AreaId; position: Vec3; markedAt: number } | null;
  time: WorldTimeState;
  activeEvents: WorldEventState[];
  discoveredRumorIds: string[];
  resourcePressure: Partial<Record<AreaId, ResourcePressureState>>;
  economy: EconomyState;
  treasure: TreasureState;
  crimeEvents: CrimeEventState[];
}

export interface GameState {
  version: number;
  saveVersion: number;
  clock: number;
  paused: boolean;
  player: PlayerState;
  entities: Record<string, Entity>;
  quests: Record<string, QuestState>;
  craftQueue: CraftJob[];
  gathering: GatheringState | null;
  buildMode: BuildModeState;
  chat: ChatMessage[];
  floatingTexts: FloatingText[];
  projectiles: Projectile[];
  visualEffects: VisualEffect[];
  realtime: RealtimeState;
  combat: CombatState;
  bandage: BandageState | null;
  spellCasting: SpellCastingState | null;
  spellEffects: SpellEffectState[];
  ui: UIState;
  world: WorldState;
  dev: DevToolState;
}
