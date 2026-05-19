export interface TooltipRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface TooltipAnchor {
  id: string;
  source: string;
  content: string;
  contentVersion?: string;
  rect: TooltipRect;
}

export interface TooltipManagerOptions {
  showDelayMs?: number;
  hideDelayMs?: number;
  viewport?: { width: number; height: number };
}

export interface TooltipSnapshot {
  visible: boolean;
  anchorId: string | null;
  source: string | null;
  content: string;
  lastReason: string;
  remountCount: number;
  mountCount: number;
  unmountCount: number;
  contentUpdateCount: number;
  positionUpdateCount: number;
  lastUpdateAt: number;
  pinned: boolean;
  lastHideReason: string;
  lastShowReason: string;
  position: { left: number; top: number; width: number; height: number };
}

const DEFAULT_VIEWPORT = { width: 1024, height: 768 };
const MARGIN = 8;
const GAP = 10;

export class TooltipManager {
  private readonly showDelayMs: number;
  private readonly hideDelayMs: number;
  private viewport: { width: number; height: number };
  private anchor: TooltipAnchor | null = null;
  private visible = false;
  private showAt: number | null = null;
  private hideAt: number | null = null;
  private lastReason = 'idle';
  private mountCount = 0;
  private unmountCount = 0;
  private contentUpdateCount = 0;
  private positionUpdateCount = 0;
  private lastUpdateAt = 0;
  private lastHideReason = 'none';
  private lastShowReason = 'none';
  private pinned = false;
  private position = { left: 0, top: 0, width: 0, height: 0 };

  constructor(options: TooltipManagerOptions = {}) {
    this.showDelayMs = options.showDelayMs ?? 180;
    this.hideDelayMs = options.hideDelayMs ?? 110;
    this.viewport = options.viewport ?? DEFAULT_VIEWPORT;
  }

  enter(anchor: TooltipAnchor, now: number): void {
    if (!anchor.id || !anchor.source || !anchor.content.trim()) {
      this.clear(now, 'empty tooltip');
      return;
    }
    if (this.sameAnchor(anchor)) {
      this.hideAt = null;
      this.showAt ??= now + this.showDelayMs;
      if (this.anchor && this.contentVersion(this.anchor) !== this.contentVersion(anchor)) {
        this.anchor = { ...anchor };
        this.contentUpdateCount += 1;
        this.lastUpdateAt = now;
        if (this.visible) this.updatePosition(anchor, now, 'content updated');
      } else if (!this.visible) {
        this.anchor = { ...anchor };
      } else if (this.anchor && rectChangedMeaningfully(this.anchor.rect, anchor.rect)) {
        this.anchor = { ...this.anchor, rect: anchor.rect };
        this.updatePosition(this.anchor, now, 'anchor moved');
      }
      this.lastReason = this.visible ? 'same anchor' : 'hover delay';
      return;
    }

    if (this.visible) {
      this.visible = false;
      this.unmountCount += 1;
      this.lastHideReason = 'anchor changed';
    }
    this.anchor = { ...anchor };
    this.visible = false;
    this.showAt = now + this.showDelayMs;
    this.hideAt = null;
    this.lastReason = 'hover start';
  }

  move(anchor: TooltipAnchor, now: number): void {
    if (!this.anchor || !this.sameAnchor(anchor)) {
      this.enter(anchor, now);
      return;
    }
    this.hideAt = null;
    if (!this.visible) this.anchor = { ...anchor };
    if (this.contentVersion(this.anchor) !== this.contentVersion(anchor)) {
      this.anchor = { ...anchor };
      this.contentUpdateCount += 1;
      this.lastUpdateAt = now;
      if (this.visible) this.updatePosition(anchor, now, 'content updated');
    } else if (this.visible && rectChangedMeaningfully(this.anchor.rect, anchor.rect)) {
      this.anchor = { ...this.anchor, rect: anchor.rect };
      this.updatePosition(this.anchor, now, 'anchor moved');
    }
  }

  leave(now: number, reason = 'left anchor'): void {
    this.showAt = null;
    this.lastReason = reason;
    this.lastHideReason = reason;
    if (!this.visible) {
      this.anchor = null;
      this.hideAt = null;
      return;
    }
    this.hideAt = now + this.hideDelayMs;
  }

  clear(now: number, reason = 'cleared'): void {
    if (this.visible) this.unmountCount += 1;
    this.anchor = null;
    this.visible = false;
    this.showAt = null;
    this.hideAt = null;
    this.lastReason = reason;
    this.lastHideReason = reason;
    this.lastUpdateAt = now;
  }

  setViewport(viewport: { width: number; height: number }, now = this.lastUpdateAt): void {
    if (viewport.width === this.viewport.width && viewport.height === this.viewport.height) return;
    this.viewport = viewport;
    if (this.visible && this.anchor) {
      this.updatePosition(this.anchor, now, 'viewport resized');
    }
  }

  tick(now: number): void {
    if (this.anchor && !this.visible && this.showAt != null && now >= this.showAt) {
      this.visible = true;
      this.showAt = null;
      this.hideAt = null;
      this.position = this.calculatePosition(this.anchor);
      this.mountCount += 1;
      this.positionUpdateCount += 1;
      this.lastUpdateAt = now;
      this.lastShowReason = 'show delay elapsed';
      this.lastReason = 'shown';
    }
    if (this.visible && this.hideAt != null && now >= this.hideAt) {
      this.visible = false;
      this.anchor = null;
      this.hideAt = null;
      this.unmountCount += 1;
      this.lastUpdateAt = now;
    }
  }

  snapshot(): TooltipSnapshot {
    return {
      visible: this.visible,
      anchorId: this.anchor?.id ?? null,
      source: this.anchor?.source ?? null,
      content: this.anchor?.content ?? '',
      lastReason: this.lastReason,
      remountCount: this.mountCount,
      mountCount: this.mountCount,
      unmountCount: this.unmountCount,
      contentUpdateCount: this.contentUpdateCount,
      positionUpdateCount: this.positionUpdateCount,
      lastUpdateAt: this.lastUpdateAt,
      pinned: this.pinned,
      lastHideReason: this.lastHideReason,
      lastShowReason: this.lastShowReason,
      position: this.position
    };
  }

  render(debug = false): string {
    const tooltip = this.visible && this.anchor
      ? `<div class="game-tooltip source-${escapeAttr(this.anchor.source)}" data-tooltip-active="${escapeAttr(this.anchor.id)}" style="left:${this.position.left}px;top:${this.position.top}px;width:${this.position.width}px">${formatTooltipContent(this.anchor.content)}</div>`
      : '';
    return `${tooltip}${debug ? this.renderDebug() : ''}`;
  }

  private renderDebug(): string {
    const snap = this.snapshot();
    return `<div class="tooltip-debug">
      <p><span>Hover</span><b>${escapeHtml(snap.anchorId ?? 'none')}</b></p>
      <p><span>Source</span><b>${escapeHtml(snap.source ?? 'none')}</b></p>
      <p><span>Reason</span><b>${escapeHtml(snap.lastReason)}</b></p>
      <p><span>Mounts</span><b>${snap.mountCount}</b></p>
      <p><span>Unmounts</span><b>${snap.unmountCount}</b></p>
      <p><span>Content</span><b>${snap.contentUpdateCount}</b></p>
      <p><span>Position</span><b>${snap.positionUpdateCount}</b></p>
      <p><span>Updated</span><b>${snap.lastUpdateAt.toFixed(0)}</b></p>
    </div>`;
  }

  private sameAnchor(anchor: TooltipAnchor): boolean {
    return this.anchor?.id === anchor.id && this.anchor.source === anchor.source;
  }

  private contentVersion(anchor: TooltipAnchor): string {
    return anchor.contentVersion ?? anchor.content;
  }

  private updatePosition(anchor: TooltipAnchor, now: number, reason: string): void {
    this.position = this.calculatePosition(anchor);
    this.positionUpdateCount += 1;
    this.lastUpdateAt = now;
    this.lastReason = reason;
  }

  private calculatePosition(anchor: TooltipAnchor): { left: number; top: number; width: number; height: number } {
    const size = estimateSize(anchor.content);
    const rightSide = anchor.rect.right + GAP;
    const leftSide = anchor.rect.left - size.width - GAP;
    let left = rightSide + size.width <= this.viewport.width - MARGIN ? rightSide : leftSide;
    if (left < MARGIN) left = anchor.rect.left + anchor.rect.width / 2 - size.width / 2;

    let top = anchor.rect.top;
    if (top + size.height > this.viewport.height - MARGIN) top = anchor.rect.top - size.height - GAP;
    if (top < MARGIN) top = anchor.rect.bottom + GAP;

    return {
      left: Math.round(clamp(left, MARGIN, this.viewport.width - size.width - MARGIN)),
      top: Math.round(clamp(top, MARGIN, this.viewport.height - size.height - MARGIN)),
      width: size.width,
      height: size.height
    };
  }
}

function rectChangedMeaningfully(a: TooltipRect, b: TooltipRect): boolean {
  return Math.abs(a.left - b.left) > 2 || Math.abs(a.top - b.top) > 2 || Math.abs(a.width - b.width) > 2 || Math.abs(a.height - b.height) > 2;
}

function estimateSize(content: string): { width: number; height: number } {
  const lines = content.split('\n').map((line) => line.trim()).filter(Boolean);
  const longest = Math.max(12, ...lines.map((line) => line.length));
  return {
    width: Math.round(clamp(longest * 7 + 22, 170, 300)),
    height: Math.round(clamp(lines.length * 18 + 18, 38, 220))
  };
}

function formatTooltipContent(content: string): string {
  const lines = content.split('\n').map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return '';
  const [title, ...details] = lines;
  return `<strong>${escapeHtml(title)}</strong>${details.map((line) => `<span>${escapeHtml(line)}</span>`).join('')}`;
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.max(min, Math.min(max, value));
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
