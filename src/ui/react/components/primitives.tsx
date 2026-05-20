import { createElement, type ButtonHTMLAttributes, type HTMLAttributes, type ReactElement, type ReactNode } from 'react';

type Tone = 'default' | 'muted' | 'accent' | 'danger' | 'warning' | 'success' | 'info';
type TextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface PrimitiveProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export interface GameWindowProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  modal?: boolean;
  children?: ReactNode;
}

export function GameWindow({ title, subtitle, actions, footer, modal = false, children, className = '', ...props }: GameWindowProps): ReactElement {
  return (
    <section className={`bb-game-window ${modal ? 'bb-game-window--modal' : ''} ${className}`.trim()} data-bb-layout="window" data-ui-window="true" {...props}>
      <PanelHeader title={title} subtitle={subtitle} actions={actions} />
      <div className="bb-game-window__body">{children}</div>
      {footer}
    </section>
  );
}

export function PanelHeader({ title, subtitle, actions, className = '', ...props }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode } & Omit<HTMLAttributes<HTMLElement>, 'title'>): ReactElement {
  return (
    <header className={`bb-panel-header ${className}`.trim()} {...props}>
      <div className="bb-panel-header__title">
        <Text as="h2" size="lg" tone="accent">
          {title}
        </Text>
        {subtitle ? (
          <Text as="span" size="sm" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </div>
      {actions ? <div className="bb-panel-header__actions">{actions}</div> : null}
    </header>
  );
}

export interface PanelTab {
  id: string;
  label: ReactNode;
  disabled?: boolean;
}

export function PanelTabs({ tabs, activeId, onSelect, className = '', ...props }: { tabs: PanelTab[]; activeId: string; onSelect: (id: string) => void } & HTMLAttributes<HTMLDivElement>): ReactElement {
  return (
    <div className={`bb-panel-tabs ${className}`.trim()} role="tablist" {...props}>
      {tabs.map((tab) => (
        <button
          className="bb-panel-tabs__tab"
          type="button"
          role="tab"
          aria-selected={tab.id === activeId}
          disabled={tab.disabled}
          key={tab.id}
          onClick={() => onSelect(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function PanelToolbar({ children, className = '', ...props }: PrimitiveProps): ReactElement {
  return (
    <div className={`bb-panel-toolbar ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function SplitPane({ start, end, children, className = '', ...props }: { start?: ReactNode; end?: ReactNode; children?: ReactNode } & HTMLAttributes<HTMLDivElement>): ReactElement {
  return (
    <div className={`bb-split-pane ${className}`.trim()} {...props}>
      {start ? <div className="bb-split-pane__start">{start}</div> : null}
      <div className="bb-split-pane__main">{children}</div>
      {end ? <div className="bb-split-pane__end">{end}</div> : null}
    </div>
  );
}

export function ScrollArea({ children, className = '', ...props }: PrimitiveProps): ReactElement {
  return (
    <div className={`bb-scroll-area ${className}`.trim()} data-bb-scroll="true" data-ui-scroll="true" {...props}>
      {children}
    </div>
  );
}

export function SlotGrid({ columns = 'auto', children, className = '', ...props }: { columns?: number | 'auto'; children?: ReactNode } & HTMLAttributes<HTMLDivElement>): ReactElement {
  const style = {
    ...props.style,
    ['--bb-slot-grid-columns' as string]: columns === 'auto' ? 'repeat(auto-fill, minmax(var(--bb-slot-size), 1fr))' : `repeat(${columns}, var(--bb-slot-size))`
  };
  return (
    <div className={`bb-slot-grid ${className}`.trim()} style={style} {...props}>
      {children}
    </div>
  );
}

export function DataList({ items, renderItem, className = '', ...props }: { items: Array<{ id: string; label: ReactNode; meta?: ReactNode }>; renderItem?: (item: { id: string; label: ReactNode; meta?: ReactNode }) => ReactNode } & HTMLAttributes<HTMLUListElement>): ReactElement {
  return (
    <ul className={`bb-data-list ${className}`.trim()} {...props}>
      {items.map((item) => (
        <li className="bb-data-list__item" key={item.id}>
          {renderItem ? renderItem(item) : (
            <>
              <span>{item.label}</span>
              {item.meta ? <span className="bb-data-list__meta">{item.meta}</span> : null}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

export function DetailPane({ title, children, className = '', ...props }: { title?: ReactNode; children?: ReactNode } & Omit<HTMLAttributes<HTMLElement>, 'title'>): ReactElement {
  return (
    <aside className={`bb-detail-pane ${className}`.trim()} {...props}>
      {title ? (
        <Text as="h3" size="md" tone="accent">
          {title}
        </Text>
      ) : null}
      <div className="bb-detail-pane__body">{children}</div>
    </aside>
  );
}

export function ActionFooter({ children, className = '', ...props }: PrimitiveProps): ReactElement {
  return (
    <footer className={`bb-action-footer ${className}`.trim()} data-ui-footer="true" {...props}>
      {children}
    </footer>
  );
}

export function InspectorDrawer({ open, children, className = '', ...props }: { open: boolean; children?: ReactNode } & HTMLAttributes<HTMLElement>): ReactElement {
  return (
    <aside className={`bb-inspector-drawer ${open ? 'bb-inspector-drawer--open' : ''} ${className}`.trim()} aria-hidden={!open} {...props}>
      {children}
    </aside>
  );
}

export function StatusRow({ label, value, className = '', ...props }: { label: ReactNode; value: ReactNode } & HTMLAttributes<HTMLDivElement>): ReactElement {
  return (
    <div className={`bb-status-row ${className}`.trim()} {...props}>
      <Text as="span" size="sm" tone="muted">
        {label}
      </Text>
      <span className="bb-status-row__value">{value}</span>
    </div>
  );
}

export function Badge({ tone = 'default', children, className = '', ...props }: { tone?: Tone; children?: ReactNode } & HTMLAttributes<HTMLSpanElement>): ReactElement {
  return (
    <span className={`bb-badge bb-badge--${tone} ${className}`.trim()} {...props}>
      {children}
    </span>
  );
}

export function IconButton({ label, children, className = '', ...props }: { label: string; children?: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>): ReactElement {
  return (
    <button className={`bb-icon-button ${className}`.trim()} type="button" aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}

type TextElement = 'span' | 'p' | 'strong' | 'h2' | 'h3' | 'div';

export function Text({
  as,
  size = 'md',
  tone = 'default',
  children,
  className = '',
  ...props
}: {
  as?: TextElement;
  size?: TextSize;
  tone?: Tone;
  children?: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLElement>): ReactElement {
  return createElement(as ?? 'span', { className: `bb-text bb-text--${size} bb-text--${tone} ${className}`.trim(), 'data-ui-text': 'true', ...props }, children);
}

export function EmptyState({ title, description, action, className = '', ...props }: { title: ReactNode; description?: ReactNode; action?: ReactNode } & Omit<HTMLAttributes<HTMLDivElement>, 'title'>): ReactElement {
  return (
    <div className={`bb-empty-state ${className}`.trim()} {...props}>
      <Text as="strong" size="md" tone="accent">
        {title}
      </Text>
      {description ? (
        <Text as="p" size="sm" tone="muted">
          {description}
        </Text>
      ) : null}
      {action ? <div className="bb-empty-state__action">{action}</div> : null}
    </div>
  );
}
