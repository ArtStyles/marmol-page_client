import type { CSSProperties } from 'react'

export const shellStyle: CSSProperties & {
  '--dash-bg': string
  '--dash-card': string
  '--dash-card-strong': string
  '--dash-border': string
  '--dash-shadow': string
  '--dash-shadow-soft': string
  '--dash-panel-radius': string
  '--dash-panel-radius-tight': string
  '--dash-control-radius': string
} = {
  '--dash-bg': 'linear-gradient(180deg, rgba(248,250,252,0.98) 0%, rgba(238,243,249,0.96) 56%, rgba(243,239,232,0.94) 100%)',
  '--dash-card': 'rgba(255, 255, 255, 0.78)',
  '--dash-card-strong': 'rgba(255, 255, 255, 0.92)',
  '--dash-border': 'rgba(15, 23, 42, 0.08)',
  '--dash-shadow': '0 24px 54px -40px rgba(15, 23, 42, 0.28)',
  '--dash-shadow-soft': '0 16px 32px -28px rgba(15, 23, 42, 0.2)',
  '--dash-panel-radius': '16px',
  '--dash-panel-radius-tight': '14px',
  '--dash-control-radius': '11px',
  backgroundImage:
    'var(--dash-bg), linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)',
  backgroundSize: 'auto, 26px 26px, 26px 26px',
}

