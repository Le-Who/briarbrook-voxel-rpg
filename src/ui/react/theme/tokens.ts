export const bbTokens = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24
  },
  lineHeight: {
    tight: 1.15,
    normal: 1.35,
    relaxed: 1.55
  },
  color: {
    panelBg: 'var(--bb-panel-bg)',
    panelBorder: 'var(--bb-panel-border)',
    accent: 'var(--bb-accent)',
    text: 'var(--bb-text)',
    textSecondary: 'var(--bb-text-secondary)',
    muted: 'var(--bb-muted)',
    danger: 'var(--bb-danger)',
    warning: 'var(--bb-warning)',
    success: 'var(--bb-success)',
    info: 'var(--bb-info)'
  },
  size: {
    slot: 44,
    icon: 28,
    minTarget: 36
  },
  radius: {
    sm: 4,
    md: 6,
    lg: 8
  },
  shadow: {
    panel: '0 18px 46px rgba(0, 0, 0, 0.56)',
    raised: '0 10px 26px rgba(0, 0, 0, 0.42)'
  },
  zIndex: {
    hud: 80,
    window: 300,
    modal: 1200,
    drag: 1550,
    tooltip: 1800,
    critical: 2000
  },
  motion: {
    fast: 90,
    base: 140,
    slow: 220
  },
  breakpoints: {
    compact: 1366,
    normal: 1600,
    wide: 1920
  }
} as const;

export type BBTokens = typeof bbTokens;
