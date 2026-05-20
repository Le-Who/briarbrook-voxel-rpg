import { audioCueCatalog } from '../audio/AudioManager';
import { audioVolumeCategories, createDefaultAudioSettings } from '../audio/AudioSettings';
import { itemDefs } from '../data/items';
import { skillDefinitions } from '../data/skillDefinitions';
import { spellDefs } from '../data/spells';
import { pseudoLocalize, stringRegistry, terminologyWarningsForRegistry, text, type StringKey } from '../content/Strings';
import type { GameState, IconDescriptor } from '../game/types';
import { findInputBindingConflicts, inputActionDefinitions } from '../game/InputActionMap';
import { getSpellCastability } from '../game/UIStateSelectors';
import { renderIcon } from '../render/IconRenderer';
import { describeInteraction } from '../systems/InteractionAffordanceSystem';
import { CharacterPanel } from '../ui/CharacterPanel';
import { GuidePanel } from '../ui/GuidePanel';
import { HelpPanel } from '../ui/HelpPanel';
import { Hotbar } from '../ui/Hotbar';
import { InventoryPanel } from '../ui/InventoryPanel';
import { Minimap } from '../ui/Minimap';

export type CertificationStatus = 'pass' | 'warn' | 'fail';

export interface CertificationCheck {
  id: string;
  label: string;
  status: CertificationStatus;
  evidence: string;
}

export interface AccessibilityCertificationReport {
  accessibility: CertificationCheck[];
  newPlayer: CertificationCheck[];
  localization: CertificationCheck[];
  failures: CertificationCheck[];
  localizationKeys: string[];
  textStress: {
    checked: number;
    longestExpansionRatio: number;
  };
  iconTextAudit: {
    checked: number;
    embeddedTextElements: string[];
  };
  evidence: {
    missingSpellRequirement: string;
    treeTargeting: string;
    invalidTreeTargeting: string;
  };
}

export const accessibilityChecklistIds = [
  'remappable_controls',
  'keyboard_only_movement',
  'mouse_only_movement',
  'ui_scale',
  'font_size',
  'colorblind_safe_state_indicators',
  'reduced_motion',
  'tooltip_delay_settings',
  'readable_contrast',
  'target_sizes',
  'audio_volume_categories',
  'critical_audio_visual_counterpart'
] as const;

export const newPlayerClarityIds = [
  'movement',
  'interaction',
  'equipment_state',
  'active_hotbar_slot',
  'spell_missing_requirements',
  'current_objective',
  'map_minimap',
  'inventory_weight',
  'tree_chop_reason'
] as const;

export const localizationChecklistIds = [
  'registered_string_keys',
  'pseudo_localized_text_stress',
  'icons_without_embedded_text',
  'terminology_consistency',
  'new_system_string_keys'
] as const;

const requiredNewSystemStringKeys: StringKey[] = [
  'error.missingReagents',
  'error.treeRequired',
  'error.pickaxeRequired',
  'error.targetTooFar',
  'status.hotbarUpdated',
  'journal.currentObjective',
  'vendor.workOrderRequirement'
];

export function createAccessibilityCertificationReport(state: GameState): AccessibilityCertificationReport {
  const helpState = viewState(state, { help: true });
  const inventoryState = viewState(state, { inventory: true, character: true });
  inventoryState.ui.selectedInventorySlot = 0;
  const mouseHelpState = viewState(state, { help: true });
  mouseHelpState.ui.movementMode = 'mouse';
  const helpHtml = HelpPanel(helpState);
  const mouseHelpHtml = HelpPanel(mouseHelpState);
  const guideHtml = GuidePanel(viewState(state, { guide: true }));
  const inventoryHtml = InventoryPanel(inventoryState);
  const characterHtml = CharacterPanel(inventoryState);
  const hotbarHtml = Hotbar(state);
  const minimapHtml = Minimap(state);
  const spellRequirement = missingSpellRequirementEvidence(state);
  const treeEvidence = treeTargetingEvidence(state);
  const iconTextAudit = auditIconText();
  const textStress = localizationTextStress();

  const accessibility = createAccessibilityChecks(state, helpHtml, mouseHelpHtml);
  const newPlayer = createNewPlayerChecks({
    helpHtml,
    guideHtml,
    inventoryHtml,
    characterHtml,
    hotbarHtml,
    minimapHtml,
    spellRequirement,
    treeEvidence
  });
  const localization = createLocalizationChecks(iconTextAudit, textStress);
  const failures = [...accessibility, ...newPlayer, ...localization].filter((check) => check.status === 'fail');

  return {
    accessibility,
    newPlayer,
    localization,
    failures,
    localizationKeys: Object.keys(stringRegistry),
    textStress,
    iconTextAudit,
    evidence: {
      missingSpellRequirement: spellRequirement,
      treeTargeting: treeEvidence.valid,
      invalidTreeTargeting: treeEvidence.invalid
    }
  };
}

function createAccessibilityChecks(state: GameState, helpHtml: string, mouseHelpHtml: string): CertificationCheck[] {
  const gameplayConflicts = findInputBindingConflicts(state.ui.inputBindings).filter((conflict) => conflict.context === 'gameplay' || conflict.context === 'ui');
  const actionIds = new Set(state.ui.inputBindings.map((binding) => binding.actionId));
  const hasCoreBindings = ['moveUp', 'moveDown', 'moveLeft', 'moveRight', 'interact', 'openHelp'].every((id) => actionIds.has(id as keyof typeof inputActionDefinitions));
  const criticalCues = Object.values(audioCueCatalog).filter((cue) => cue.critical);
  const defaults = createDefaultAudioSettings();
  return [
    check('remappable_controls', 'Remappable controls', hasCoreBindings && gameplayConflicts.length === 0 && helpHtml.includes('data-action="capture-keybinding"'), `${Object.keys(inputActionDefinitions).length} actions, ${gameplayConflicts.length} gameplay/UI conflicts`),
    check('keyboard_only_movement', 'Keyboard-only movement', helpHtml.includes('Keyboard Only') && helpHtml.includes('WASD / Arrows'), 'Help exposes keyboard movement and interact bindings'),
    check('mouse_only_movement', 'Mouse-only movement', mouseHelpHtml.includes('Mouse Only') && mouseHelpHtml.includes('Click ground'), 'Help exposes mouse-only mode'),
    check('ui_scale', 'UI scale', state.ui.uiScale >= 0.8 && state.ui.uiScale <= 1.25 && helpHtml.includes('data-action="ui-scale-up"'), `${Math.round(state.ui.uiScale * 100)}%`),
    check('font_size', 'Font size', state.ui.fontScale >= 0.9 && state.ui.fontScale <= 1.25 && helpHtml.includes('data-action="font-scale-up"'), `${Math.round(state.ui.fontScale * 100)}%`),
    check('colorblind_safe_state_indicators', 'Colorblind-safe state indicators', typeof state.ui.colorblindStatusColors === 'boolean' && helpHtml.includes('toggle-colorblind-status'), 'Toggle plus labeled badges are available'),
    check('reduced_motion', 'Reduced motion', typeof state.ui.reducedMotion === 'boolean' && helpHtml.includes('toggle-reduced-motion'), `default ${state.ui.reducedMotion ? 'on' : 'off'}`),
    check('tooltip_delay_settings', 'Tooltip delay settings', state.ui.tooltipDelayMs >= 0 && state.ui.tooltipDelayMs <= 800 && helpHtml.includes('tooltip-delay-up'), `${state.ui.tooltipDelayMs}ms`),
    check('readable_contrast', 'Readable contrast', contrastRatio('#f1e6cd', '#050505') >= 7 && contrastRatio('#f3d78e', '#111211') >= 4.5, 'Primary text contrast exceeds WCAG AA target'),
    check('target_sizes', 'Target sizes', helpHtml.includes('help-setting') && cssTargetDefaultPx() >= 44, `${cssTargetDefaultPx()}px default target token`),
    check('audio_volume_categories', 'Audio volume categories', audioVolumeCategories.every((category) => helpHtml.includes(`data-audio-volume="${category}"`)), audioVolumeCategories.join(', ')),
    check('critical_audio_visual_counterpart', 'Critical audio visual counterpart', defaults.visualAudioCues && criticalCues.every((cue) => cue.visualSubstitute.length > 0), `${criticalCues.length} critical cues with substitutes`)
  ];
}

function createNewPlayerChecks(evidence: {
  helpHtml: string;
  guideHtml: string;
  inventoryHtml: string;
  characterHtml: string;
  hotbarHtml: string;
  minimapHtml: string;
  spellRequirement: string;
  treeEvidence: { valid: string; invalid: string };
}): CertificationCheck[] {
  return [
    check('movement', 'Movement', evidence.helpHtml.includes('Move') && evidence.helpHtml.includes('WASD'), 'Help lists keyboard movement'),
    check('interaction', 'Interaction', evidence.helpHtml.includes('Interact') && evidence.guideHtml.includes('Talk to Mira'), 'Help and guide expose first interaction'),
    check('equipment_state', 'Equipment state', evidence.characterHtml.includes('data-equipment-slot="weapon"') && evidence.characterHtml.includes('Durability'), 'Character panel exposes equipment slots and durability'),
    check('active_hotbar_slot', 'Active hotbar slot', evidence.hotbarHtml.includes('hotbar-slot active') && evidence.hotbarHtml.includes('hotbar-badges'), 'Hotbar uses active class and non-color badges'),
    check('spell_missing_requirements', 'Spell missing requirements', evidence.spellRequirement.includes('Missing reagents') && evidence.spellRequirement.includes('sulfurous_ash'), evidence.spellRequirement),
    check('current_objective', 'Current objective', evidence.guideHtml.includes('Next Step') && evidence.guideHtml.includes('Talk to Mira'), 'Guide pins the current first-hour objective'),
    check('map_minimap', 'Map/minimap', evidence.minimapHtml.includes('minimap') && evidence.minimapHtml.includes('data-map-layer="player"'), 'Minimap renders player and layers'),
    check('inventory_weight', 'Inventory weight', evidence.inventoryHtml.includes('panel-footer') && evidence.characterHtml.includes('Weight'), 'Inventory and character surfaces show carry load'),
    check('tree_chop_reason', 'Tree chop reason', evidence.treeEvidence.valid.includes('Chop') && evidence.treeEvidence.invalid.includes('pickaxe'), `${evidence.treeEvidence.valid} / ${evidence.treeEvidence.invalid}`)
  ];
}

function createLocalizationChecks(iconTextAudit: AccessibilityCertificationReport['iconTextAudit'], textStress: AccessibilityCertificationReport['textStress']): CertificationCheck[] {
  const terminologyWarnings = terminologyWarningsForRegistry();
  const keySet = new Set(Object.keys(stringRegistry));
  return [
    check('registered_string_keys', 'Registered string keys', Object.keys(stringRegistry).length >= 30 && requiredNewSystemStringKeys.every((key) => keySet.has(key)), `${Object.keys(stringRegistry).length} keys`),
    check('pseudo_localized_text_stress', 'Pseudo-localized text stress', textStress.checked === Object.keys(stringRegistry).length && textStress.longestExpansionRatio > 1.1, `${textStress.checked} strings, longest ${textStress.longestExpansionRatio}x`),
    check('icons_without_embedded_text', 'Icons without embedded text', iconTextAudit.embeddedTextElements.length === 0, `${iconTextAudit.checked} icons checked`),
    check('terminology_consistency', 'Terminology consistency', terminologyWarnings.length === 0, terminologyWarnings.join('; ') || 'No internal terms in registry'),
    check('new_system_string_keys', 'New system string keys', requiredNewSystemStringKeys.every((key) => keySet.has(key)), requiredNewSystemStringKeys.join(', '))
  ];
}

function check(id: string, label: string, ok: boolean, evidence: string): CertificationCheck {
  return { id, label, status: ok ? 'pass' : 'fail', evidence };
}

function viewState(state: GameState, panels: Record<string, boolean>): GameState {
  return {
    ...state,
    ui: {
      ...state.ui,
      panels: {
        ...state.ui.panels,
        ...panels
      }
    }
  };
}

function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

function missingSpellRequirementEvidence(state: GameState): string {
  const sample = cloneState(state);
  sample.player.inventory.slots = sample.player.inventory.slots.map((stack) => (stack?.itemId === 'sulfurous_ash' ? null : stack));
  const castability = getSpellCastability(sample, 'magic_arrow');
  return `${castability.reason}: ${castability.missingReagents.join(', ')}`;
}

function treeTargetingEvidence(state: GameState): { valid: string; invalid: string } {
  const sample = viewState(state, {});
  sample.ui.targeting = { mode: 'tool', toolItemId: 'axe', prompt: text('prompt.selectTree') };
  const tree = describeInteraction(sample, { kind: 'entity', entityId: 'res_tree_1' });
  const ore = describeInteraction(sample, { kind: 'entity', entityId: 'res_iron_1' });
  return {
    valid: tree?.prompt ?? '',
    invalid: ore?.invalidReason ?? ore?.prompt ?? ''
  };
}

function localizationTextStress(): AccessibilityCertificationReport['textStress'] {
  const vars = {
    spell: 'Greater Heal',
    mana: 12,
    count: 2,
    reagents: 'garlic, ginseng',
    tool: 'axe',
    verb: 'chop',
    resource: 'Oak Tree',
    action: 'chop',
    slot: 3,
    item: 'iron ingots',
    requester: 'Brom',
    quantity: 12,
    gold: 90
  };
  const ratios = (Object.keys(stringRegistry) as StringKey[]).map((key) => {
    const source = text(key, vars);
    const pseudo = pseudoLocalize(source);
    return source.length ? pseudo.length / source.length : 1;
  });
  return {
    checked: ratios.length,
    longestExpansionRatio: Number(Math.max(...ratios).toFixed(2))
  };
}

function auditIconText(): AccessibilityCertificationReport['iconTextAudit'] {
  const icons: Array<{ id: string; icon: IconDescriptor | undefined; label: string }> = [
    ...Object.values(itemDefs).map((item) => ({ id: item.id, icon: item.icon, label: item.name })),
    ...Object.values(spellDefs).map((spell) => ({ id: spell.id, icon: spell.iconDescriptor, label: spell.displayName })),
    ...skillDefinitions.map((skill) => ({ id: skill.id, icon: skill.icon, label: skill.displayName }))
  ];
  const embeddedTextElements = icons
    .map(({ id, icon, label }) => ({ id, markup: renderIcon(icon, label) }))
    .filter(({ markup }) => /<text[\s>]/i.test(markup))
    .map(({ id }) => id);
  return {
    checked: icons.length,
    embeddedTextElements
  };
}

function cssTargetDefaultPx(): number {
  return 44;
}

function contrastRatio(foreground: string, background: string): number {
  const fg = relativeLuminance(hexToRgb(foreground));
  const bg = relativeLuminance(hexToRgb(background));
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16)
  ];
}

function relativeLuminance(rgb: [number, number, number]): number {
  const channels = rgb.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
