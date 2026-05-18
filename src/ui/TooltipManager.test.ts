import { describe, expect, it } from 'vitest';
import { TooltipManager } from './TooltipManager';

const rect = (left: number, top: number, width = 48, height = 48) => ({ left, top, right: left + width, bottom: top + height, width, height });

describe('TooltipManager', () => {
  it('keeps a stable tooltip mounted while the same anchor is hovered', () => {
    const manager = new TooltipManager({ showDelayMs: 200, hideDelayMs: 100, viewport: { width: 800, height: 600 } });

    manager.enter({ id: 'inv:0:iron_sword', source: 'inventory', content: 'Iron Sword', rect: rect(120, 420) }, 1000);
    manager.tick(1199);
    expect(manager.snapshot().visible).toBe(false);

    manager.tick(1200);
    const first = manager.snapshot();
    expect(first.visible).toBe(true);
    expect(first.anchorId).toBe('inv:0:iron_sword');
    expect(first.remountCount).toBe(1);

    manager.move({ id: 'inv:0:iron_sword', source: 'inventory', content: 'Iron Sword', rect: rect(121, 421) }, 1216);
    manager.tick(1280);
    expect(manager.snapshot().remountCount).toBe(1);
  });

  it('uses a hide grace period to avoid panel-border flicker', () => {
    const manager = new TooltipManager({ showDelayMs: 150, hideDelayMs: 120, viewport: { width: 800, height: 600 } });

    manager.enter({ id: 'spell:heal', source: 'spellbook', content: 'Heal', rect: rect(300, 180) }, 0);
    manager.tick(150);
    manager.leave(200, 'left anchor');
    expect(manager.snapshot().visible).toBe(true);

    manager.tick(319);
    expect(manager.snapshot().visible).toBe(true);

    manager.tick(320);
    expect(manager.snapshot().visible).toBe(false);
    expect(manager.snapshot().lastReason).toBe('left anchor');
  });

  it('clamps anchored tooltip position inside the viewport', () => {
    const manager = new TooltipManager({ showDelayMs: 0, hideDelayMs: 100, viewport: { width: 320, height: 220 } });

    manager.enter({ id: 'hotbar:9', source: 'hotbar', content: 'Magic Arrow', rect: rect(292, 188, 28, 28) }, 0);
    manager.tick(0);

    const position = manager.snapshot().position;
    expect(position.left).toBeGreaterThanOrEqual(8);
    expect(position.top).toBeGreaterThanOrEqual(8);
    expect(position.left + position.width).toBeLessThanOrEqual(312);
    expect(position.top + position.height).toBeLessThanOrEqual(212);
  });
});
