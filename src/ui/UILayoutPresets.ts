import type { GameState, HudDensityMode, MarketViewMode, SpellbookViewMode, TooltipDetailMode, UILayoutPreset } from '../game/types';

export interface UILayoutPresetDefinition {
  id: UILayoutPreset;
  label: string;
  uiScale: number;
  fontScale: number;
  tooltipMode: TooltipDetailMode;
  tooltipDelayMs: number;
  hudDensity: HudDensityMode;
  visiblePanels: Partial<Record<string, boolean>>;
  spellbookViewMode: SpellbookViewMode;
  marketView: MarketViewMode;
  showChatTabs: boolean;
}

export const uiLayoutPresets: Record<UILayoutPreset, UILayoutPresetDefinition> = {
  default: {
    id: 'default',
    label: 'Default',
    uiScale: 1,
    fontScale: 1,
    tooltipMode: 'compact',
    tooltipDelayMs: 240,
    hudDensity: 'normal',
    visiblePanels: { guide: true, inventory: false, spellbook: false, skills: false, market: false, crafting: false, combatActions: false },
    spellbookViewMode: 'grid',
    marketView: 'work',
    showChatTabs: true
  },
  compact: {
    id: 'compact',
    label: 'Compact',
    uiScale: 0.9,
    fontScale: 0.95,
    tooltipMode: 'compact',
    tooltipDelayMs: 260,
    hudDensity: 'compact',
    visiblePanels: { guide: false, inventory: true, spellbook: false, skills: false, market: false, crafting: false, combatActions: false },
    spellbookViewMode: 'grid',
    marketView: 'work',
    showChatTabs: false
  },
  large: {
    id: 'large',
    label: 'Large Text',
    uiScale: 1.16,
    fontScale: 1.16,
    tooltipMode: 'advanced',
    tooltipDelayMs: 320,
    hudDensity: 'normal',
    visiblePanels: { guide: true, inventory: true, spellbook: false, skills: false, market: false, crafting: false, combatActions: false },
    spellbookViewMode: 'list',
    marketView: 'work',
    showChatTabs: true
  },
  combat: {
    id: 'combat',
    label: 'Combat',
    uiScale: 1,
    fontScale: 1,
    tooltipMode: 'compact',
    tooltipDelayMs: 180,
    hudDensity: 'compact',
    visiblePanels: { guide: false, inventory: true, spellbook: false, skills: false, market: false, crafting: false, combatActions: true },
    spellbookViewMode: 'grid',
    marketView: 'work',
    showChatTabs: false
  },
  crafting: {
    id: 'crafting',
    label: 'Crafting / Market',
    uiScale: 1,
    fontScale: 1,
    tooltipMode: 'advanced',
    tooltipDelayMs: 260,
    hudDensity: 'normal',
    visiblePanels: { guide: false, inventory: true, spellbook: false, skills: true, market: true, crafting: true, combatActions: false },
    spellbookViewMode: 'list',
    marketView: 'work',
    showChatTabs: true
  },
  exploration: {
    id: 'exploration',
    label: 'Minimal Exploration',
    uiScale: 0.95,
    fontScale: 1,
    tooltipMode: 'compact',
    tooltipDelayMs: 300,
    hudDensity: 'minimal',
    visiblePanels: { guide: true, inventory: false, spellbook: false, skills: false, market: false, crafting: false, combatActions: false },
    spellbookViewMode: 'grid',
    marketView: 'work',
    showChatTabs: false
  },
  stream: {
    id: 'stream',
    label: 'Stream',
    uiScale: 1.08,
    fontScale: 1.08,
    tooltipMode: 'compact',
    tooltipDelayMs: 260,
    hudDensity: 'compact',
    visiblePanels: { guide: false, inventory: false, spellbook: false, skills: false, market: false, crafting: false, combatActions: false },
    spellbookViewMode: 'grid',
    marketView: 'work',
    showChatTabs: false
  }
};

export function applyUiLayoutPresetSettings(state: GameState, presetId: UILayoutPreset): void {
  const preset = uiLayoutPresets[presetId] ?? uiLayoutPresets.default;
  state.ui.windowLayouts = {};
  state.ui.windowLayoutPreset = preset.id;
  state.ui.uiScale = preset.uiScale;
  state.ui.fontScale = preset.fontScale;
  state.ui.tooltipMode = preset.tooltipMode;
  state.ui.tooltipDelayMs = preset.tooltipDelayMs;
  state.ui.hudDensity = preset.hudDensity;
  state.ui.spellbookViewMode = preset.spellbookViewMode;
  state.ui.marketView = preset.marketView;
  state.ui.showChatTabs = preset.showChatTabs;
  Object.entries(preset.visiblePanels).forEach(([panel, open]) => {
    state.ui.panels[panel] = Boolean(open);
  });
}
