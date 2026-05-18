import { describe, expect, it } from 'vitest';
import { shouldDeferHudReplacement, shouldThrottleHudReplacement } from './UIRenderGuards';

describe('UI render guards', () => {
  it('defers full HUD replacement while UI scroll or drag interactions are active', () => {
    expect(
      shouldDeferHudReplacement({
        editingUiField: false,
        uiPointerDown: false,
        windowDragActive: false,
        hotbarDragActive: false,
        scrollSettleUntil: 1500,
        now: 1200
      })
    ).toBe(true);

    expect(
      shouldDeferHudReplacement({
        editingUiField: false,
        uiPointerDown: false,
        windowDragActive: true,
        hotbarDragActive: false,
        scrollSettleUntil: 0,
        now: 1200
      })
    ).toBe(true);

    expect(
      shouldDeferHudReplacement({
        editingUiField: false,
        uiPointerDown: false,
        windowDragActive: false,
        hotbarDragActive: false,
        scrollSettleUntil: 0,
        now: 1200
      })
    ).toBe(false);
  });

  it('throttles repeated full HUD replacement so click targets stay stable', () => {
    expect(shouldThrottleHudReplacement({ lastReplacementAt: 1000, minIntervalMs: 180, now: 1100 })).toBe(true);
    expect(shouldThrottleHudReplacement({ lastReplacementAt: 1000, minIntervalMs: 180, now: 1200 })).toBe(false);
    expect(shouldThrottleHudReplacement({ lastReplacementAt: 0, minIntervalMs: 180, now: 10 })).toBe(false);
  });
});
