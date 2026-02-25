import type { CSSProperties } from 'react'

export const shellStyle: CSSProperties & {
  '--dash-bg': string
  '--dash-card': string
  '--dash-border': string
  '--dash-shadow': string
} = {
  '--dash-bg': 'linear-gradient(135deg, #f6f7fb 0%, #e9eef7 45%, #f7f2eb 100%)',
  '--dash-card': 'rgba(255, 255, 255, 0.78)',
  '--dash-border': 'rgba(15, 23, 42, 0.08)',
  '--dash-shadow': '0 24px 60px -40px rgba(15, 23, 42, 0.25)',
  backgroundImage: 'var(--dash-bg)',
}
