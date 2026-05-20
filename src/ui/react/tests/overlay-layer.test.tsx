import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { OverlayLayer } from '../components/OverlayLayer';
import { ReactTooltipController, createToastQueue, placeOverlay } from '../components/overlayState';

const rect = (left: number, top: number, width = 44, height = 44) => ({ left, top, right: left + width, bottom: top + height, width, height });

describe('React overlay layer', () => {
  it('renders stable top-level overlay portals outside scroll containers', () => {
    const markup = renderToStaticMarkup(<OverlayLayer />);

    expect(markup).toContain('class="bb-overlay-layer');
    expect(markup).toContain('data-overlay-root="tooltip"');
    expect(markup).toContain('data-overlay-root="popover"');
    expect(markup).toContain('data-overlay-root="modal"');
    expect(markup).toContain('data-overlay-root="toast"');
  });

  it('keeps one hover tooltip mounted while unrelated ticks occur', () => {
    const controller = new ReactTooltipController({ viewport: { width: 800, height: 600 }, showDelayMs: 100, hideDelayMs: 100 });

    controller.enter({ anchorId: 'inv:0', anchorRect: rect(100, 100), content: 'Iron Sword', contentVersion: 'v1', tooltipType: 'hover' }, 0);
    controller.tick(100);
    expect(controller.snapshot().mountCount).toBe(1);
    expect(controller.snapshot().visible).toBe(true);

    controller.tick(130);
    controller.tick(160);
    controller.move({ anchorId: 'inv:0', anchorRect: rect(101, 101), content: 'Iron Sword rebuilt', contentVersion: 'v1', tooltipType: 'hover' }, 170);

    expect(controller.snapshot().mountCount).toBe(1);
    expect(controller.snapshot().contentUpdateCount).toBe(0);
    expect(controller.snapshot().positionUpdateCount).toBe(1);
  });

  it('flips and clamps tooltip placement away from the hotbar safe area', () => {
    const placement = placeOverlay({
      anchorRect: rect(640, 708, 44, 44),
      overlaySize: { width: 220, height: 88 },
      viewport: { width: 1366, height: 768 },
      avoidHotbar: true
    });

    expect(placement.left).toBeGreaterThanOrEqual(8);
    expect(placement.top).toBeGreaterThanOrEqual(8);
    expect(placement.top + placement.height).toBeLessThanOrEqual(768 - 96);
  });

  it('throttles repeated toasts instead of duplicating chat spam', () => {
    const queue = createToastQueue({ repeatWindowMs: 500 });

    queue.push({ id: 'a', message: 'Inventory full', tone: 'warning' }, 1000);
    queue.push({ id: 'b', message: 'Inventory full', tone: 'warning' }, 1100);
    queue.push({ id: 'c', message: 'Bank opened', tone: 'info' }, 1200);

    const snapshot = queue.snapshot();
    expect(snapshot).toHaveLength(2);
    expect(snapshot[0]).toMatchObject({ message: 'Inventory full', repeatCount: 2 });
    expect(snapshot[1]).toMatchObject({ message: 'Bank opened', repeatCount: 1 });
  });
});
