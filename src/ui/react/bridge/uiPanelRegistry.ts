export type UIPanelOwner = 'legacy' | 'react';

export const uiPanelIds = [
  'inventory',
  'bank',
  'hotbar',
  'spellbook',
  'crafting',
  'market',
  'journal',
  'map',
  'skills',
  'build',
  'chat',
  'help',
  'settings',
  'tooltip',
  'modal',
  'toast'
] as const;

export type UIPanelId = (typeof uiPanelIds)[number];

export const uiPanelRegistry: Record<UIPanelId, UIPanelOwner> = {
  inventory: 'react',
  bank: 'react',
  hotbar: 'react',
  spellbook: 'react',
  crafting: 'react',
  market: 'react',
  journal: 'react',
  map: 'react',
  skills: 'react',
  build: 'react',
  chat: 'react',
  help: 'react',
  settings: 'react',
  tooltip: 'legacy',
  modal: 'legacy',
  toast: 'legacy'
};

export function getPanelOwner(panelId: string): UIPanelOwner {
  return Object.prototype.hasOwnProperty.call(uiPanelRegistry, panelId) ? uiPanelRegistry[panelId as UIPanelId] : 'legacy';
}

export function isReactPanel(panelId: string): boolean {
  return getPanelOwner(panelId) === 'react';
}
