export interface HudReplacementGuard {
  editingUiField: boolean;
  uiPointerDown: boolean;
  windowDragActive: boolean;
  hotbarDragActive: boolean;
  scrollSettleUntil: number;
  now: number;
}

export interface HudReplacementThrottle {
  lastReplacementAt: number;
  minIntervalMs: number;
  now: number;
}

export function shouldDeferHudReplacement(guard: HudReplacementGuard): boolean {
  return (
    guard.editingUiField ||
    guard.uiPointerDown ||
    guard.windowDragActive ||
    guard.hotbarDragActive ||
    guard.now < guard.scrollSettleUntil
  );
}

export function shouldThrottleHudReplacement(throttle: HudReplacementThrottle): boolean {
  return throttle.lastReplacementAt > 0 && throttle.now - throttle.lastReplacementAt < throttle.minIntervalMs;
}
