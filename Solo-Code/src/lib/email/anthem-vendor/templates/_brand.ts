// Aplus1 brand styles for emails — clean white + subtle orange fade.

export const brand = {
  orange: '#FF4F18',
  orangeLight: '#FF7A45',
  orangeFade: '#FFF4EF',
  orangeMuted: '#FFE4D6',
  ink: '#141517',
  body: '#4A4A4A',
  mute: '#9CA3AF',
  border: '#E8E6E3',
  surface: '#F2F4F7',
  white: '#FFFFFF',
  success: '#059669',
  warning: '#DC2626',
} as const

export const main = {
  backgroundColor: brand.white,
  fontFamily:
    "'IBM Plex Sans Thai','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif",
  margin: 0,
  padding: '24px 0',
}

export const container = {
  backgroundColor: brand.white,
  border: `1px solid ${brand.border}`,
  borderRadius: '12px',
  padding: '0',
  maxWidth: '560px',
  margin: '0 auto',
  overflow: 'hidden' as const,
}

export const brandBar = {
  display: 'inline-block',
  backgroundColor: brand.white,
  color: brand.ink,
  fontSize: '11px',
  fontWeight: 600 as const,
  letterSpacing: '0.06em',
  padding: '5px 12px',
  borderRadius: '999px',
  margin: '0 0 20px',
  border: `1px solid ${brand.border}`,
}

export const brandBarTones = {
  brand: {
    borderColor: brand.orangeMuted,
    color: brand.orange,
    backgroundColor: brand.orangeFade,
  },
  success: {
    borderColor: '#A7F3D0',
    color: brand.success,
    backgroundColor: '#ECFDF5',
  },
  warning: {
    borderColor: '#FECACA',
    color: brand.warning,
    backgroundColor: '#FEF2F2',
  },
  neutral: {
    borderColor: brand.border,
    color: brand.body,
    backgroundColor: brand.white,
  },
} as const

export const h1 = {
  fontSize: '22px',
  fontWeight: 600 as const,
  color: brand.ink,
  margin: '0',
  letterSpacing: '-0.01em',
  lineHeight: '1.3',
}

export const text = {
  fontSize: '15px',
  color: brand.body,
  lineHeight: '1.6',
  margin: '0 0 20px',
}

export const button = {
  backgroundColor: brand.orange,
  color: brand.white,
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '8px',
  padding: '13px 28px',
  textDecoration: 'none',
  display: 'inline-block',
  letterSpacing: '0.01em',
  border: 'none',
}

export const link = { color: brand.orange, textDecoration: 'none', fontWeight: 600 as const }

export const code = {
  fontFamily: "'JetBrains Mono','Courier New',monospace",
  fontSize: '28px',
  fontWeight: 700 as const,
  color: brand.ink,
  letterSpacing: '0.25em',
  background: brand.surface,
  padding: '20px 24px',
  borderRadius: '8px',
  border: `1px solid ${brand.border}`,
  margin: '0 0 28px',
  textAlign: 'center' as const,
}

export const footer = {
  fontSize: '12px',
  color: brand.mute,
  margin: '0',
  lineHeight: '1.6',
  textAlign: 'center' as const,
}

export const divider = {
  border: 'none',
  borderTop: `1px solid ${brand.border}`,
  margin: '28px 0 24px',
}
