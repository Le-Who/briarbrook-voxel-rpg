import type { ChatPanelMode, GameState, HudDensityMode, MarketViewMode, MinimapMode, SpellbookViewMode, TooltipDetailMode, UILayoutPreset } from '../game/types';

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
  chatMode: ChatPanelMode;
  minimapMode: MinimapMode;
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
    showChatTabs: true,
    chatMode: 'expanded',
    minimapMode: 'standard'
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
    showChatTabs: false,
    chatMode: 'compact',
    minimapMode: 'compact'
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
    showChatTabs: true,
    chatMode: 'expanded',
    minimapMode: 'standard'
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
    showChatTabs: false,
    chatMode: 'combatHidden',
    minimapMode: 'compact'
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
    showChatTabs: true,
    chatMode: 'compact',
    minimapMode: 'standard'
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
    showChatTabs: false,
    chatMode: 'collapsed',
    minimapMode: 'compact'
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
    showChatTabs: false,
    chatMode: 'collapsed',
    minimapMode: 'compact'
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
  state.ui.chatMode = preset.chatMode;
  state.ui.minimapMode = preset.minimapMode;
  state.ui.panels.map = preset.minimapMode === 'expanded';
  Object.entries(preset.visiblePanels).forEach(([panel, open]) => {
    state.ui.panels[panel] = Boolean(open);
  });
}
