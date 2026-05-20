import { useEffect, useMemo, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { OverlayPlacement, ToastSnapshot, TooltipSnapshot } from './overlayState';

type OverlayRoot = 'tooltip' | 'popover' | 'context-menu' | 'modal' | 'toast';

interface PortalProps {
  children?: ReactNode;
}

export interface OverlayLayerProps {
  tooltip?: TooltipSnapshot | null;
  popover?: ReactNode;
  contextMenu?: ReactNode;
  modal?: ReactNode;
  toasts?: ToastSnapshot[];
}

export function OverlayLayer({ tooltip = null, popover, contextMenu, modal, toasts = [] }: OverlayLayerProps): ReactElement {
  return (
    <div className="bb-overlay-layer" data-overlay-layer="react">
      <div className="bb-tooltip-portal" data-overlay-root="tooltip">
        {tooltip && tooltip.visible ? <TooltipFrame tooltip={tooltip} /> : null}
      </div>
      <div className="bb-popover-portal" data-overlay-root="popover">
        {popover}
      </div>
      <div className="bb-context-menu-portal" data-overlay-root="context-menu">
        {contextMenu}
      </div>
      <div className="bb-modal-portal" data-overlay-root="modal">
        {modal}
      </div>
      <ToastLayer toasts={toasts} />
    </div>
  );
}

export function TooltipPortal({ children }: PortalProps): ReactElement {
  return <OverlayPortal root="tooltip">{children}</OverlayPortal>;
}

export function PopoverPortal({ children }: PortalProps): ReactElement {
  return <OverlayPortal root="popover">{children}</OverlayPortal>;
}

export function ContextMenuPortal({ children }: PortalProps): ReactElement {
  useEscapeClose();
  return <OverlayPortal root="context-menu">{children}</OverlayPortal>;
}

export function ModalPortal({ children }: PortalProps): ReactElement {
  useEscapeClose();
  return <OverlayPortal root="modal">{children}</OverlayPortal>;
}

export function ToastLayer({ toasts = [] }: { toasts?: ToastSnapshot[] }): ReactElement {
  return (
    <div className="bb-toast-layer" data-overlay-root="toast" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div className={`bb-toast bb-toast--${toast.tone}`} data-toast-id={toast.id} key={toast.id}>
          <span>{toast.message}</span>
          {toast.repeatCount > 1 ? <span className="bb-toast__repeat">x{toast.repeatCount}</span> : null}
        </div>
      ))}
    </div>
  );
}

function OverlayPortal({ root, children }: { root: OverlayRoot; children?: ReactNode }): ReactElement {
  const target = useMemo(() => getOverlayRoot(root), [root]);
  const className = `bb-${root}-portal`;
  const content = (
    <div className={className} data-overlay-root={root}>
      {children}
    </div>
  );

  if (!target) {
    return content;
  }

  return createPortal(content, target);
}

function TooltipFrame({ tooltip }: { tooltip: TooltipSnapshot }): ReactElement | null {
  if (!tooltip.position) {
    return null;
  }

  const style = placementStyle(tooltip.position);
  const interactive = tooltip.tooltipType !== 'hover' || tooltip.pinned;

  return (
    <div className={`bb-tooltip-frame ${interactive ? 'bb-tooltip-frame--interactive' : ''}`} style={style} data-tooltip-anchor={tooltip.anchorId ?? ''} data-tooltip-type={tooltip.tooltipType} data-ui-tooltip="true">
      {tooltip.content}
    </div>
  );
}

function placementStyle(placement: OverlayPlacement): CSSProperties {
  return {
    left: placement.left,
    top: placement.top,
    width: placement.width,
      minHeight: placement.height
  };
}

function getOverlayRoot(root: OverlayRoot): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const host = document.querySelector<HTMLElement>('.bb-overlay-layer');
  if (!host) {
    return null;
  }

  return host.querySelector<HTMLElement>(`[data-overlay-root="${root}"]`);
}

function useEscapeClose(): void {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);
}
