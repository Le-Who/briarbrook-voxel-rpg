import { describe, expect, it } from 'vitest';
import {
  clampWindowRect,
  defaultWindowRect,
  isEditableTargetDescriptor,
  parseHotbarSourceText,
  sanitizeStoredLayout,
  serviceStackWindowRects,
  windowDefinitions,
  windowLayerFor,
  windowQaWarningsForManagedWindows,
  type ManagedWindowQaObservation
} from './WindowManager';

describe('window layout helpers', () => {
  it('keeps a dragged window title bar inside the viewport and above the hotbar safe area', () => {
    const rect = clampWindowRect(
      { x: -220, y: 740, width: 620, height: 520 },
      { width: 1366, height: 768 },
      { margin: 8, safeBottom: 96, titlebarHeight: 34 }
    );

    expect(rect.x).toBe(8);
    expect(rect.y).toBeLessThanOrEqual(768 - 96 - 34);
    expect(rect.y).toBeGreaterThanOrEqual(8);
  });

  it('opens the spellbook in the usable area instead of covering the hotbar by default', () => {
    const rect = defaultWindowRect('spellbook', { width: 620, height: 520 }, { width: 1366, height: 768 });

    expect(rect.x).toBe(Math.round((1366 - 620) / 2));
    expect(rect.y + rect.height).toBeLessThanOrEqual(768 - 96);
  });

  it('docks chat bottom-left by default and keeps it above the hotbar safe area', () => {
    const rect = defaultWindowRect('chat', { width: 380, height: 260 }, { width: 1366, height: 768 });

    expect(rect.x).toBe(12);
    expect(rect.y + rect.height).toBeLessThanOrEqual(768 - 96);
  });

  it('opens the expanded map as a large managed planning window', () => {
    const rect = defaultWindowRect('map', { width: 760, height: 560 }, { width: 1366, height: 768 });

    expect(rect.x).toBe(Math.round((1366 - 760) / 2));
    expect(rect.y + rect.height).toBeLessThanOrEqual(768 - 96);
  });

  it('marks inventory as a horizontally and vertically resizable managed window', () => {
    expect(windowDefinitions.inventory.resizable).toBe('both');
    expect(windowDefinitions.inventory.minWidth).toBeGreaterThanOrEqual(232);
    expect(windowDefinitions.inventory.maxWidth).toBeGreaterThan(windowDefinitions.inventory.minWidth);
  });

  it('uses a full-width large-window fallback on small viewports while keeping the hotbar safe area', () => {
    const rect = defaultWindowRect('spellbook', { width: 900, height: 700 }, { width: 520, height: 720 });

    expect(rect.x).toBe(8);
    expect(rect.y).toBe(8);
    expect(rect.width).toBe(504);
    expect(rect.y + rect.height).toBeLessThanOrEqual(720 - 96);
  });

  it('clamps the smithy crafting window to phone width for service reference captures', () => {
    const rect = defaultWindowRect('crafting', { width: 640, height: 732 }, { width: 390, height: 844 });

    expect(rect.x).toBe(8);
    expect(rect.width).toBe(374);
    expect(rect.y + rect.height).toBeLessThanOrEqual(844 - 96);
  });

  it('stacks bank and inventory service windows on phone viewports without overlap', () => {
    const rects = serviceStackWindowRects({ width: 390, height: 844 });
    expect(rects).not.toBeNull();
    expect(rects?.bank.x).toBe(8);
    expect(rects?.inventory.x).toBe(8);
    expect(rects?.bank.width).toBe(374);
    expect(rects?.inventory.width).toBe(374);
    expect((rects?.bank.y ?? 0) + (rects?.bank.height ?? 0)).toBeLessThanOrEqual(rects?.inventory.y ?? 0);
    expect((rects?.inventory.y ?? 0) + (rects?.inventory.height ?? 0)).toBeLessThanOrEqual(844 - 96);
  });

  it('clamps saved layout entries before applying persisted positions', () => {
    const layout = sanitizeStoredLayout(
      {
        inventory: { x: -999, y: 900, width: 260, height: 400 },
        market: { x: 20, y: Number.POSITIVE_INFINITY, width: 520, height: 340 },
        spellbook: { x: 120, y: 90, width: 620, height: 500 }
      },
      { width: 1366, height: 768 }
    );

    expect(layout.inventory).toEqual({ x: 8, y: 264, width: 260, height: 400 });
    expect(layout.market).toBeUndefined();
    expect(layout.spellbook).toEqual({ x: 120, y: 90, width: 620, height: 500 });
  });

  it('keeps modal windows above non-modal windows regardless of focus order', () => {
    expect(windowLayerFor('trade', 1)).toBeGreaterThan(windowLayerFor('inventory', 99));
    expect(windowLayerFor('merchant', 2)).toBeGreaterThan(windowLayerFor('spellbook', 120));
  });

  it('reports QA warnings for unsafe title bars, hotbar overlap, missing scroll, and duplicate z-indexes', () => {
    const base: ManagedWindowQaObservation = {
      id: 'spellbook',
      rect: { x: 100, y: 100, width: 620, height: 520 },
      headerRect: { x: 100, y: 100, width: 620, height: 40 },
      zIndex: 110,
      isModal: false,
      contentScrollMode: 'body',
      hasMaxHeight: true,
      needsScroll: false,
      hasInternalScrollRegion: true
    };
    const warnings = windowQaWarningsForManagedWindows(
      [
        { ...base, id: 'spellbook', rect: { x: 100, y: 650, width: 620, height: 140 }, headerRect: { x: -12, y: 650, width: 620, height: 40 }, zIndex: 120 },
        { ...base, id: 'market', zIndex: 120, needsScroll: true, hasInternalScrollRegion: false, hasMaxHeight: false }
      ],
      { viewport: { width: 1366, height: 768 }, hotbarTop: 680 }
    );

    expect(warnings).toContain('spellbook title bar is outside the viewport');
    expect(warnings).toContain('spellbook overlaps the hotbar safe area');
    expect(warnings).toContain('market is managed without a max-height constraint');
    expect(warnings).toContain('market content overflows without an internal scroll region');
    expect(warnings).toContain('duplicate z-index 120 for spellbook, market');
  });
});

describe('browser input helpers', () => {
  it('parses custom hotbar sources without relying on native HTML5 dataTransfer', () => {
    expect(parseHotbarSourceText('spell:magic_arrow')).toEqual({ kind: 'spell', id: 'magic_arrow' });
    expect(parseHotbarSourceText('tool:hatchet')).toEqual({ kind: 'tool', id: 'hatchet' });
    expect(parseHotbarSourceText('action:defend')).toEqual({ kind: 'action', id: 'defend' });
    expect(parseHotbarSourceText('action:invalid')).toBeNull();
    expect(parseHotbarSourceText('')).toBeNull();
  });

  it('preserves native text interaction for editable fields only', () => {
    expect(isEditableTargetDescriptor({ tagName: 'INPUT' })).toBe(true);
    expect(isEditableTargetDescriptor({ tagName: 'TEXTAREA' })).toBe(true);
    expect(isEditableTargetDescriptor({ tagName: 'DIV', isContentEditable: true })).toBe(true);
    expect(isEditableTargetDescriptor({ tagName: 'BUTTON' })).toBe(false);
    expect(isEditableTargetDescriptor({ tagName: 'SECTION' })).toBe(false);
  });
});
