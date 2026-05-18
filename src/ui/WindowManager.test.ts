import { describe, expect, it } from 'vitest';
import { applyWindowPreset, resolveWindowLayout, resolveWindowZIndex, updateWindowFocusOrder, updateWindowLayout } from './WindowManager';

const viewport = { width: 1366, height: 768 };

describe('WindowManager', () => {
  it('clamps large windows away from the hotbar safe area', () => {
    const layout = resolveWindowLayout('spellbook', { x: 1200, y: 700, width: 980, height: 720 }, viewport, 'default');

    expect(layout.x).toBeGreaterThanOrEqual(8);
    expect(layout.y).toBeGreaterThanOrEqual(8);
    expect(layout.x + layout.width).toBeLessThanOrEqual(viewport.width - 8);
    expect(layout.y + layout.height).toBeLessThanOrEqual(viewport.height - 96);
  });

  it('enforces minimum sizes while resizing', () => {
    const layout = updateWindowLayout('market', { x: 200, y: 100, width: 920, height: 520 }, { dx: -900, dy: -900, mode: 'resize' }, viewport);

    expect(layout.width).toBeGreaterThanOrEqual(620);
    expect(layout.height).toBeGreaterThanOrEqual(360);
  });

  it('provides compact and combat layout presets without saved window positions', () => {
    const compact = applyWindowPreset('compact', viewport);
    const combat = applyWindowPreset('combat', viewport);

    expect(compact.spellbook.width).toBeLessThan(applyWindowPreset('large', viewport).spellbook.width);
    expect(combat.inventory.x).toBeGreaterThan(combat.skills.x);
  });

  it('raises the most recently focused window above earlier focused windows', () => {
    expect(resolveWindowZIndex('skills', ['skills', 'spellbook'])).toBeGreaterThan(resolveWindowZIndex('skills'));
    expect(resolveWindowZIndex('spellbook', ['skills', 'spellbook'])).toBeGreaterThan(resolveWindowZIndex('skills', ['skills', 'spellbook']));
    expect(resolveWindowZIndex('help', ['spellbook', 'help'])).toBeGreaterThan(resolveWindowZIndex('spellbook', ['spellbook', 'help']));
  });

  it('moves a focused or newly opened window to the front of focus order', () => {
    expect(updateWindowFocusOrder(['spellbook', 'skills'], 'help')).toEqual(['spellbook', 'skills', 'help']);
    expect(updateWindowFocusOrder(['spellbook', 'skills', 'help'], 'skills')).toEqual(['spellbook', 'help', 'skills']);
  });
});
