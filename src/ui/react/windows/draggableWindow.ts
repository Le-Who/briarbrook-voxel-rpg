import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import type { GameAction } from '../../../game/Actions';
import type { ManagedWindowId } from '../../../game/types';
import { reactWindowDefinitions, resolveReactWindowLayout, type ReactWindowId, type ReactWindowRect } from './windowManagerV2';

type DispatchAction = (action: GameAction) => { accepted: boolean };

const persistentWindowIds = new Set<ReactWindowId>(['inventory', 'spellbook', 'market', 'journal', 'help', 'chat']);

export function useDraggableReactWindow(
  id: ReactWindowId,
  dispatchAction: DispatchAction,
  savedLayout?: Partial<ReactWindowRect> | null
): {
  style: CSSProperties;
  windowProps: { 'data-react-window-draggable': 'true' };
  headerProps: {
    'data-window-drag-handle': 'true';
    'data-react-window-drag-handle': 'true';
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
  };
} {
  const [rect, setRect] = useState<ReactWindowRect>(() => defaultWindowRect(id, savedLayout));
  const activeDrag = useRef<{ pointerId: number; startX: number; startY: number; origin: ReactWindowRect } | null>(null);

  useEffect(() => {
    if (!activeDrag.current) setRect(defaultWindowRect(id, savedLayout));
  }, [id, savedLayout?.x, savedLayout?.y, savedLayout?.width, savedLayout?.height]);

  const finishDrag = (event: ReactPointerEvent<HTMLElement>): void => {
    const drag = activeDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const nextRect = clampRect(id, { ...drag.origin, x: drag.origin.x + event.clientX - drag.startX, y: drag.origin.y + event.clientY - drag.startY });
    setRect(nextRect);
    activeDrag.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (persistentWindowIds.has(id)) {
      dispatchAction({ type: 'SET_WINDOW_LAYOUT', windowId: id as ManagedWindowId, layout: { x: nextRect.x, y: nextRect.y, width: nextRect.width, height: nextRect.height } });
    }
  };

  return {
    style: rectStyle(id, rect),
    windowProps: { 'data-react-window-draggable': 'true' },
    headerProps: {
      'data-window-drag-handle': 'true',
      'data-react-window-drag-handle': 'true',
      onPointerDown: (event) => {
        if (event.button !== 0 || isInteractiveTarget(event.target)) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        activeDrag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, origin: rect };
      },
      onPointerMove: (event) => {
        const drag = activeDrag.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        setRect(clampRect(id, { ...drag.origin, x: drag.origin.x + event.clientX - drag.startX, y: drag.origin.y + event.clientY - drag.startY }));
      },
      onPointerUp: finishDrag,
      onPointerCancel: finishDrag
    }
  };
}

export function reactWindowStyle(id: ReactWindowId, savedLayout?: Partial<ReactWindowRect> | null): CSSProperties {
  return rectStyle(id, defaultWindowRect(id, savedLayout));
}

function defaultWindowRect(id: ReactWindowId, savedLayout?: Partial<ReactWindowRect> | null): ReactWindowRect {
  const viewport = typeof window === 'undefined' ? { width: 1366, height: 768 } : { width: window.innerWidth, height: window.innerHeight };
  return resolveReactWindowLayout(id, savedLayout ?? null, viewport);
}

function clampRect(id: ReactWindowId, rect: ReactWindowRect): ReactWindowRect {
  const viewport = typeof window === 'undefined' ? { width: 1366, height: 768 } : { width: window.innerWidth, height: window.innerHeight };
  return resolveReactWindowLayout(id, rect, viewport);
}

function rectStyle(id: ReactWindowId, rect: ReactWindowRect): CSSProperties {
  return {
    position: 'fixed',
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height,
    zIndex: reactWindowDefinitions[id].zLayer
  };
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest('button, input, textarea, select, a, [data-no-window-drag="true"]'));
}
