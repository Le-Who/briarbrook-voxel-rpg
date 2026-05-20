import type { ReactNode } from 'react';

export interface OverlayRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface OverlaySize {
  width: number;
  height: number;
}

export interface OverlayViewport {
  width: number;
  height: number;
}

export interface OverlayPlacement extends OverlaySize {
  left: number;
  top: number;
  side: 'top' | 'right' | 'bottom' | 'left';
}

export interface OverlayPlacementInput {
  anchorRect: OverlayRect;
  overlaySize: OverlaySize;
  viewport: OverlayViewport;
  avoidHotbar?: boolean;
  margin?: number;
  gap?: number;
  hotbarSafeHeight?: number;
}

export type TooltipType = 'hover' | 'pinned' | 'inspector';
export type TooltipUpdateReason = 'idle' | 'anchor' | 'rect' | 'content' | 'viewport' | 'hidden';

export interface TooltipInput {
  anchorId: string;
  anchorRect: OverlayRect;
  content: ReactNode;
  contentVersion: string;
  tooltipType: TooltipType;
  pinned?: boolean;
  overlaySize?: OverlaySize;
}

export interface TooltipSnapshot {
  visible: boolean;
  anchorId: string | null;
  anchorRect: OverlayRect | null;
  content: ReactNode | null;
  contentVersion: string | null;
  showDelay: number;
  hideDelay: number;
  pinned: boolean;
  tooltipType: TooltipType;
  lastUpdateReason: TooltipUpdateReason;
  mountCount: number;
  unmountCount: number;
  contentUpdateCount: number;
  positionUpdateCount: number;
  position: OverlayPlacement | null;
}

export interface TooltipControllerOptions {
  viewport: OverlayViewport;
  showDelayMs?: number;
  hideDelayMs?: number;
  defaultOverlaySize?: OverlaySize;
}

interface TooltipInternalState {
  input: TooltipInput | null;
  visible: boolean;
  showAt: number | null;
  hideAt: number | null;
  mountCount: number;
  unmountCount: number;
  contentUpdateCount: number;
  positionUpdateCount: number;
  lastUpdateReason: TooltipUpdateReason;
  position: OverlayPlacement | null;
}

export interface ToastInput {
  id: string;
  message: string;
  tone?: ToastTone;
  ttlMs?: number;
}

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export interface ToastSnapshot extends Required<ToastInput> {
  createdAt: number;
  lastAt: number;
  repeatCount: number;
}

export interface ToastQueueOptions {
  repeatWindowMs?: number;
  maxToasts?: number;
  defaultTtlMs?: number;
}

const DEFAULT_MARGIN = 8;
const DEFAULT_GAP = 10;
const DEFAULT_HOTBAR_SAFE_HEIGHT = 96;
const DEFAULT_TOOLTIP_SIZE: OverlaySize = { width: 220, height: 88 };
const MEANINGFUL_RECT_DELTA = 1;

export function placeOverlay({
  anchorRect,
  overlaySize,
  viewport,
  avoidHotbar = true,
  margin = DEFAULT_MARGIN,
  gap = DEFAULT_GAP,
  hotbarSafeHeight = DEFAULT_HOTBAR_SAFE_HEIGHT
}: OverlayPlacementInput): OverlayPlacement {
  const safeBottom = viewport.height - margin - (avoidHotbar ? hotbarSafeHeight : 0);
  const safeRight = viewport.width - margin;
  const side = anchorRect.top - gap - overlaySize.height >= margin ? 'top' : anchorRect.bottom + gap + overlaySize.height <= safeBottom ? 'bottom' : anchorRect.left > viewport.width / 2 ? 'left' : 'right';

  let left = anchorRect.left + anchorRect.width / 2 - overlaySize.width / 2;
  let top = anchorRect.bottom + gap;

  if (side === 'top') {
    top = anchorRect.top - gap - overlaySize.height;
  } else if (side === 'left') {
    left = anchorRect.left - gap - overlaySize.width;
    top = anchorRect.top + anchorRect.height / 2 - overlaySize.height / 2;
  } else if (side === 'right') {
    left = anchorRect.right + gap;
    top = anchorRect.top + anchorRect.height / 2 - overlaySize.height / 2;
  }

  return {
    left: clamp(left, margin, Math.max(margin, safeRight - overlaySize.width)),
    top: clamp(top, margin, Math.max(margin, safeBottom - overlaySize.height)),
    width: overlaySize.width,
    height: overlaySize.height,
    side
  };
}

export class ReactTooltipController {
  private viewport: OverlayViewport;
  private readonly showDelay: number;
  private readonly hideDelay: number;
  private readonly defaultOverlaySize: OverlaySize;
  private state: TooltipInternalState = {
    input: null,
    visible: false,
    showAt: null,
    hideAt: null,
    mountCount: 0,
    unmountCount: 0,
    contentUpdateCount: 0,
    positionUpdateCount: 0,
    lastUpdateReason: 'idle',
    position: null
  };

  constructor({ viewport, showDelayMs = 240, hideDelayMs = 120, defaultOverlaySize = DEFAULT_TOOLTIP_SIZE }: TooltipControllerOptions) {
    this.viewport = viewport;
    this.showDelay = showDelayMs;
    this.hideDelay = hideDelayMs;
    this.defaultOverlaySize = defaultOverlaySize;
  }

  enter(input: TooltipInput, now: number): void {
    const isSameAnchor = this.state.input?.anchorId === input.anchorId;
    this.state.input = cloneTooltipInput(input);
    this.state.hideAt = null;
    this.state.showAt = this.state.visible || isSameAnchor ? now : now + this.showDelay;
    this.state.lastUpdateReason = isSameAnchor ? 'rect' : 'anchor';
  }

  move(input: TooltipInput, now: number): void {
    const previous = this.state.input;
    if (!previous || previous.anchorId !== input.anchorId) {
      this.enter(input, now);
      return;
    }

    const rectChanged = hasMeaningfulRectChange(previous.anchorRect, input.anchorRect);
    const contentChanged = previous.contentVersion !== input.contentVersion;

    this.state.input = cloneTooltipInput(input);
    if (contentChanged) {
      this.state.contentUpdateCount += 1;
      this.state.lastUpdateReason = 'content';
    } else if (rectChanged) {
      this.state.lastUpdateReason = 'rect';
    }

    if (this.state.visible && rectChanged) {
      this.state.position = this.resolvePosition(input);
      this.state.positionUpdateCount += 1;
    }
  }

  leave(now: number, reason: TooltipUpdateReason = 'hidden'): void {
    this.state.showAt = null;
    this.state.hideAt = now + this.hideDelay;
    this.state.lastUpdateReason = reason;
  }

  setViewport(viewport: OverlayViewport): void {
    if (this.viewport.width === viewport.width && this.viewport.height === viewport.height) {
      return;
    }

    this.viewport = viewport;
    this.state.lastUpdateReason = 'viewport';
    if (this.state.visible && this.state.input) {
      this.state.position = this.resolvePosition(this.state.input);
      this.state.positionUpdateCount += 1;
    }
  }

  tick(now: number): void {
    if (!this.state.visible && this.state.input && this.state.showAt !== null && now >= this.state.showAt) {
      this.state.visible = true;
      this.state.showAt = null;
      this.state.position = this.resolvePosition(this.state.input);
      this.state.mountCount += 1;
      return;
    }

    if (this.state.visible && this.state.hideAt !== null && now >= this.state.hideAt) {
      this.state.visible = false;
      this.state.hideAt = null;
      this.state.position = null;
      this.state.unmountCount += 1;
    }
  }

  snapshot(): TooltipSnapshot {
    return {
      visible: this.state.visible,
      anchorId: this.state.input?.anchorId ?? null,
      anchorRect: this.state.input ? { ...this.state.input.anchorRect } : null,
      content: this.state.input?.content ?? null,
      contentVersion: this.state.input?.contentVersion ?? null,
      showDelay: this.showDelay,
      hideDelay: this.hideDelay,
      pinned: this.state.input?.pinned ?? false,
      tooltipType: this.state.input?.tooltipType ?? 'hover',
      lastUpdateReason: this.state.lastUpdateReason,
      mountCount: this.state.mountCount,
      unmountCount: this.state.unmountCount,
      contentUpdateCount: this.state.contentUpdateCount,
      positionUpdateCount: this.state.positionUpdateCount,
      position: this.state.position ? { ...this.state.position } : null
    };
  }

  private resolvePosition(input: TooltipInput): OverlayPlacement {
    return placeOverlay({
      anchorRect: input.anchorRect,
      overlaySize: input.overlaySize ?? this.defaultOverlaySize,
      viewport: this.viewport,
      avoidHotbar: input.tooltipType === 'hover'
    });
  }
}

export function createToastQueue(options: ToastQueueOptions = {}) {
  const repeatWindowMs = options.repeatWindowMs ?? 1500;
  const maxToasts = options.maxToasts ?? 4;
  const defaultTtlMs = options.defaultTtlMs ?? 3600;
  let toasts: ToastSnapshot[] = [];

  return {
    push(input: ToastInput, now: number): void {
      const tone = input.tone ?? 'info';
      const ttlMs = input.ttlMs ?? defaultTtlMs;
      const repeat = toasts.find((toast) => toast.message === input.message && toast.tone === tone && now - toast.lastAt <= repeatWindowMs);

      if (repeat) {
        repeat.lastAt = now;
        repeat.repeatCount += 1;
        return;
      }

      toasts = [
        ...toasts,
        {
          id: input.id,
          message: input.message,
          tone,
          ttlMs,
          createdAt: now,
          lastAt: now,
          repeatCount: 1
        }
      ].slice(-maxToasts);
    },
    prune(now: number): void {
      toasts = toasts.filter((toast) => now - toast.lastAt < toast.ttlMs);
    },
    snapshot(): ToastSnapshot[] {
      return toasts.map((toast) => ({ ...toast }));
    }
  };
}

function cloneTooltipInput(input: TooltipInput): TooltipInput {
  return {
    ...input,
    anchorRect: { ...input.anchorRect },
    overlaySize: input.overlaySize ? { ...input.overlaySize } : undefined
  };
}

function hasMeaningfulRectChange(a: OverlayRect, b: OverlayRect): boolean {
  return Math.abs(a.left - b.left) >= MEANINGFUL_RECT_DELTA || Math.abs(a.top - b.top) >= MEANINGFUL_RECT_DELTA || Math.abs(a.width - b.width) >= MEANINGFUL_RECT_DELTA || Math.abs(a.height - b.height) >= MEANINGFUL_RECT_DELTA;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
