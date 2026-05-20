import { useEffect } from 'react';

export interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ReactLayoutGuardObservation {
  id: string;
  rect: RectLike;
  overflows: boolean;
  hasScrollArea: boolean;
  clippedTextCount: number;
  tooltipOutsideOverlay: boolean;
  overlapsHotbar: boolean;
}

export interface ReactLayoutGuardContext {
  viewport: {
    width: number;
    height: number;
  };
}

const reportedWarnings = new Set<string>();

export function ReactLayoutGuard(): null {
  useEffect(() => {
    if (!isDevRuntime() || typeof document === 'undefined') return;
    const frame = window.requestAnimationFrame(() => {
      const root = document.querySelector<HTMLElement>('.react-ui-layer');
      if (!root) return;
      collectReactLayoutWarnings(root).forEach((warning) => {
        if (reportedWarnings.has(warning)) return;
        reportedWarnings.add(warning);
        console.warn(`[react-ui-layout-guard] ${warning}`);
      });
    });
    return () => window.cancelAnimationFrame(frame);
  });

  return null;
}

export function collectReactLayoutWarnings(root: HTMLElement, viewport = viewportFromWindow()): string[] {
  return reactLayoutWarningsForObservations(collectReactLayoutObservations(root, viewport), { viewport });
}

export function reactLayoutWarningsForObservations(observations: ReactLayoutGuardObservation[], context: ReactLayoutGuardContext): string[] {
  const warnings: string[] = [];
  observations.forEach((observation) => {
    if (observation.overflows && !observation.hasScrollArea) warnings.push(`${observation.id} overflows without a ScrollArea.`);
    if (observation.clippedTextCount > 0) warnings.push(`${observation.id} has ${observation.clippedTextCount} clipped text nodes.`);
    if (observation.tooltipOutsideOverlay) warnings.push(`${observation.id} is not mounted in the tooltip overlay root.`);
    if (isOutsideViewport(observation.rect, context.viewport)) warnings.push(`${observation.id} is outside the viewport.`);
    if (observation.overlapsHotbar) warnings.push(`${observation.id} overlaps the hotbar safe area.`);
  });
  return warnings;
}

function collectReactLayoutObservations(root: HTMLElement, viewport: ReactLayoutGuardContext['viewport']): ReactLayoutGuardObservation[] {
  const hotbar = root.querySelector<HTMLElement>('[data-react-panel="hotbar"]');
  const hotbarRect = hotbar ? rectFromDom(hotbar.getBoundingClientRect()) : null;
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-react-panel]')).map((panel) => {
    const id = panel.dataset.reactPanel ?? 'unknown';
    const rect = rectFromDom(panel.getBoundingClientRect());
    const overflows = panel.scrollHeight > panel.clientHeight + 1 || panel.scrollWidth > panel.clientWidth + 1;
    const hasScrollArea = panel.matches('[data-bb-scroll="true"]') || Boolean(panel.querySelector('[data-bb-scroll="true"]'));
    return {
      id,
      rect,
      overflows,
      hasScrollArea,
      clippedTextCount: countClippedText(panel),
      tooltipOutsideOverlay: false,
      overlapsHotbar: Boolean(hotbarRect && id !== 'hotbar' && intersects(rect, hotbarRect) && isVisible(panel))
    };
  });

  const tooltipWarnings = Array.from(root.querySelectorAll<HTMLElement>('.bb-tooltip-frame, .game-tooltip')).map((tooltip) => ({
    id: 'tooltip',
    rect: rectFromDom(tooltip.getBoundingClientRect()),
    overflows: false,
    hasScrollArea: true,
    clippedTextCount: 0,
    tooltipOutsideOverlay: !Boolean(tooltip.closest('[data-overlay-root="tooltip"], .tooltip-layer')),
    overlapsHotbar: false
  }));

  return [...panels, ...tooltipWarnings].filter((observation) => isMeaningfulRect(observation.rect) || observation.tooltipOutsideOverlay);
}

function countClippedText(root: HTMLElement): number {
  const candidates = Array.from(root.querySelectorAll<HTMLElement>('.bb-text, button, [data-guard-text]'));
  return candidates.filter((element) => {
    if (!isVisible(element) || element.dataset.allowTextClip === 'true') return false;
    const style = window.getComputedStyle(element);
    const clips = /(hidden|clip)/.test(`${style.overflow} ${style.overflowX} ${style.overflowY}`);
    return clips && (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1);
  }).length;
}

function isOutsideViewport(rect: RectLike, viewport: ReactLayoutGuardContext['viewport']): boolean {
  return rect.x < 0 || rect.y < 0 || rect.x + rect.width > viewport.width || rect.y + rect.height > viewport.height;
}

function intersects(a: RectLike, b: RectLike): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function rectFromDom(rect: DOMRect): RectLike {
  return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
}

function isMeaningfulRect(rect: RectLike): boolean {
  return rect.width > 0 && rect.height > 0;
}

function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) !== 0;
}

function viewportFromWindow(): ReactLayoutGuardContext['viewport'] {
  return { width: window.innerWidth, height: window.innerHeight };
}

function isDevRuntime(): boolean {
  return typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV);
}
