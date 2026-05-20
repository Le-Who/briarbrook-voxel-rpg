export const visualUiTokenNames = [
  '--ui-panel-bg',
  '--ui-panel-border-gold',
  '--ui-title-text',
  '--ui-tab-active',
  '--ui-tab-inactive',
  '--ui-slot-border',
  '--ui-selected-state',
  '--ui-invalid-state',
  '--ui-minimap-compact-bg',
  '--ui-target-frame-bg',
  '--ui-item-badge-bg',
  '--ui-graph-gathering',
  '--ui-graph-crafting',
  '--ui-graph-combat',
  '--ui-map-marker-objective'
] as const;

export type VisualUiTokenName = (typeof visualUiTokenNames)[number];
