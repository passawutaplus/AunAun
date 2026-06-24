import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Column,
  Text,
} from "@react-email/components";
import { CONTACT_EMAIL, LINE_ID, LINE_URL, SITE_DOMAIN, SITE_NAME, SITE_URL } from "./brandMeta";
import {
  brand,
  main,
  container,
  text,
  footer,
  divider,
  brandBar,
  brandBarTones,
  button,
  link,
} from "./_brand";
import {
  EmailIcon,
  EmailOfficialPartnership,
  EmailTitleRow,
  logoUrl,
  type IconName,
} from "./icons";

export type BadgeTone = "brand" | "warning" | "success" | "neutral";

const outerWrap = {
  backgroundColor: brand.white,
  margin: 0,
  padding: "32px 16px",
} as const;

const headerFade = {
  background: `linear-gradient(180deg, ${brand.orangeFade} 0%, ${brand.white} 100%)`,
  padding: "28px 32px 24px",
  borderBottom: `2px solid ${brand.orange}`,
} as const;

const bodyPad = { padding: "28px 32px 32px" } as const;

const wordmark = {
  fontSize: "17px",
  fontWeight: 600 as const,
  letterSpacing: "-0.02em",
  margin: 0,
  color: brand.ink,
  lineHeight: "1.2",
} as const;

const wordmarkAccent = { color: brand.orange } as const;

const tagline = {
  fontSize: "12px",
  color: brand.mute,
  margin: "2px 0 0",
  lineHeight: "1.4",
} as const;

const contactHeading = {
  fontSize: "11px",
  fontWeight: 600 as const,
  color: brand.body,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  margin: "0 0 12px",
  textAlign: "center" as const,
} as const;

const contactLink = {
  color: brand.body,
  textDecoration: "none",
  fontWeight: 500 as const,
} as const;

const footerNoteStyle = {
  fontSize: "12px",
  color: brand.mute,
  margin: "0 0 20px",
  lineHeight: "1.5",
  textAlign: "center" as const,
} as const;

function badgeStyle(tone: BadgeTone): React.CSSProperties {
  const t = brandBarTones[tone];
  return {
    ...brandBar,
    border: `1px solid ${t.borderColor}`,
    color: t.color,
    backgroundColor: t.backgroundColor,
  };
}

export interface EmailLayoutProps {
  preview: string;
  badge?: string;
  badgeTone?: BadgeTone;
  title: string;
  icon?: IconName;
  children: React.ReactNode;
  footerNote?: React.ReactNode;
}

function EmailContactFooter() {
  const year = new Date().getFullYear();

  return (
    <>
      <Text style={contactHeading}>ติดต่อเรา</Text>
      <Row style={{ margin: "0 0 8px" }}>
        <Column align="center">
          <Row style={{ width: "auto" }}>
            <Column style={{ width: "20px", verticalAlign: "middle" }}>
              <EmailIcon name="globe" size={16} />
            </Column>
            <Column style={{ verticalAlign: "middle", paddingLeft: "6px" }}>
              <Link href={SITE_URL} style={contactLink}>
                {SITE_DOMAIN}
              </Link>
            </Column>
          </Row>
        </Column>
      </Row>
      <Row style={{ margin: "0 0 8px" }}>
        <Column align="center">
          <Row style={{ width: "auto" }}>
            <Column style={{ width: "20px", verticalAlign: "middle" }}>
              <EmailIcon name="mail" size={16} />
            </Column>
            <Column style={{ verticalAlign: "middle", paddingLeft: "6px" }}>
              <Link href={`mailto:${CONTACT_EMAIL}`} style={contactLink}>
                {CONTACT_EMAIL}
              </Link>
            </Column>
          </Row>
        </Column>
      </Row>
      <Row style={{ margin: "0 0 16px" }}>
        <Column align="center">
          <Row style={{ width: "auto" }}>
            <Column style={{ width: "20px", verticalAlign: "middle" }}>
              <EmailIcon name="line" size={16} />
            </Column>
            <Column style={{ verticalAlign: "middle", paddingLeft: "6px" }}>
              <Link href={LINE_URL} style={contactLink}>
                LINE {LINE_ID}
              </Link>
            </Column>
          </Row>
        </Column>
      </Row>
      <Text style={footer}>
        © {year} {SITE_NAME}
      </Text>
    </>
  );
}

export function EmailLayout({
  preview,
  badge,
  badgeTone = "brand",
  title,
  icon,
  children,
  footerNote,
}: EmailLayoutProps) {
  return (
    <Html lang="th" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={outerWrap}>
          <Container style={container}>
            <div style={headerFade}>
              <Row>
                <Column style={{ width: "36px", verticalAlign: "middle" }}>
                  <Img
                    src={logoUrl()}
                    alt={SITE_NAME}
                    width={32}
                    height={32}
                    style={{ borderRadius: "8px", display: "block" }}
                  />
                </Column>
                <Column style={{ verticalAlign: "middle", paddingLeft: "10px" }}>
                  <Text style={wordmark}>
                    <span style={wordmarkAccent}>1</span>
                    <span>PX</span>
                  </Text>
                  <Text style={tagline}>ชุมชนครีเอทีฟ — ทุกคนคือ 1 PX</Text>
                </Column>
              </Row>
            </div>
            <div style={bodyPad}>
              {badge ? <Text style={badgeStyle(badgeTone)}>{badge}</Text> : null}
              <EmailTitleRow icon={icon} title={title} />
              {children}
              <Hr style={divider} />
              {footerNote ? <Text style={footerNoteStyle}>{footerNote}</Text> : null}
              <EmailOfficialPartnership />
              <EmailContactFooter />
            </div>
          </Container>
        </Container>
      </Body>
    </Html>
  );
}

export function EmailCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: brand.surface,
        border: `1px solid ${brand.border}`,
        borderRadius: "8px",
        padding: "20px 22px",
        margin: "0 0 24px",
      }}
    >
      {children}
    </div>
  );
}

export function EmailCardLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        color: brand.mute,
        fontSize: "11px",
        textTransform: "uppercase" as const,
        letterSpacing: "0.08em",
        margin: "0 0 4px",
        fontWeight: 600,
      }}
    >
      {children}
    </Text>
  );
}

export function EmailCardRow({
  children,
  highlight,
}: {
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Text
      style={{
        fontSize: "14px",
        color: highlight ? brand.orange : brand.body,
        fontWeight: highlight ? 600 : 400,
        margin: "0 0 10px",
        lineHeight: "1.5",
      }}
    >
      {children}
    </Text>
  );
}

export function EmailButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button style={button} href={href}>
      {children}
    </Button>
  );
}

export function EmailText({ children, small }: { children: React.ReactNode; small?: boolean }) {
  return <Text style={small ? { ...text, fontSize: "13px" } : text}>{children}</Text>;
}

export { text, link, brand };
