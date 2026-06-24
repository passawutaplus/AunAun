import * as React from 'react'
import { Img, Link, Row, Column, Text } from '@react-email/components'
import { LINE_ID, LINE_URL, SITE_NAME, SITE_URL } from './brandMeta'
import { brand, h1, link } from './_brand'

export const ICON_NAMES = [
  'payment', 'celebration', 'warning', 'receipt', 'credits', 'bell',
  'document', 'mail', 'check', 'globe', 'line', 'cancel',
  'hire', 'chat', 'job', 'collab',
  'gift', 'follow', 'application', 'topup', 'cashout',
] as const

export type IconName = (typeof ICON_NAMES)[number]

export function iconUrl(name: IconName): string {
  return `${SITE_URL}/email/icons/${name}.png`
}

export function logoUrl(): string {
  return `${SITE_URL}/email/logo.png`
}

export function EmailIcon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <Img
      src={iconUrl(name)}
      alt=""
      width={size}
      height={size}
      style={{ display: 'block', margin: 0 }}
    />
  )
}

export function EmailTitleRow({ icon, title }: { icon?: IconName; title: string }) {
  if (!icon) {
    return <Text style={{ ...h1, margin: '0 0 16px' }}>{title}</Text>
  }

  return (
    <Row style={{ margin: '0 0 16px' }}>
      <Column style={{ width: '32px', verticalAlign: 'middle' }}>
        <EmailIcon name={icon} size={24} />
      </Column>
      <Column style={{ verticalAlign: 'middle', paddingLeft: '10px' }}>
        <Text style={h1}>{title}</Text>
      </Column>
    </Row>
  )
}

export function EmailOfficialPartnership() {
  return (
    <Row style={{ margin: '0 0 24px' }}>
      <Column align="center">
        <div style={{
          backgroundColor: brand.surface,
          border: `1px solid ${brand.border}`,
          borderRadius: '10px',
          padding: '14px 18px',
          textAlign: 'center' as const,
          maxWidth: '320px',
          margin: '0 auto',
        }}>
          <Row style={{ width: 'auto', margin: '0 auto 10px' }}>
            <Column style={{ width: '32px', verticalAlign: 'middle' }}>
              <Img
                src={logoUrl()}
                alt={SITE_NAME}
                width={28}
                height={28}
                style={{ borderRadius: '7px', display: 'block' }}
              />
            </Column>
            <Column style={{ width: '20px', verticalAlign: 'middle', textAlign: 'center' as const }}>
              <Text style={{ margin: 0, fontSize: '14px', color: brand.mute, fontWeight: 600 }}>×</Text>
            </Column>
            <Column style={{ width: '32px', verticalAlign: 'middle' }}>
              <Link href={LINE_URL}>
                <EmailIcon name="line" size={28} />
              </Link>
            </Column>
          </Row>
          <Text style={{ margin: 0, fontSize: '11px', color: brand.body, lineHeight: '1.5' }}>
            อีเมลอย่างเป็นทางการจาก {SITE_NAME}
          </Text>
          <Text style={{ margin: '4px 0 0', fontSize: '11px', color: brand.mute, lineHeight: '1.5' }}>
            แจ้งเตือนผ่าน LINE ได้ที่{' '}
            <Link href={LINE_URL} style={{ ...link, fontSize: '11px' }}>{LINE_ID}</Link>
          </Text>
        </div>
      </Column>
    </Row>
  )
}

export function EmailFeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <Row style={{ margin: '0 0 10px' }}>
      <Column style={{ width: '28px', verticalAlign: 'top' }}>
        <EmailIcon name="check" size={18} />
      </Column>
      <Column style={{ verticalAlign: 'top', paddingLeft: '8px' }}>
        <Text style={{ fontSize: '14px', color: brand.body, margin: 0, lineHeight: '1.5' }}>
          {children}
        </Text>
      </Column>
    </Row>
  )
}
