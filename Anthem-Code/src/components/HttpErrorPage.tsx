import * as React from 'react'
import { createPortal } from 'react-dom'
import { BRAND_NAME, BRAND_SUPPORT_EMAIL } from '@/lib/brandConfig'
import { startStatusCodeWave } from '@/components/statusCodeWave'
import { HTTP_ERROR_COPY, resolveErrorKind, type HttpErrorKind } from '@/lib/httpErrorCopy'
import { cn } from '@/lib/utils'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { loadLocalePrefs, saveLocalePrefs, type AppLocale } from '@/lib/localePrefs'

const LANGS: { code: AppLocale; label: string }[] = [
  { code: 'th', label: 'TH' },
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中文' },
]
const WORDS: Record<'home' | 'retry' | 'contact', Record<AppLocale, string>> = {
  home: { th: 'หน้าแรก', en: 'Home', zh: '首页' },
  retry: { th: 'ลองใหม่', en: 'Retry', zh: '重试' },
  contact: { th: 'ติดต่อเรา', en: 'Contact', zh: '联系我们' },
}

type ActionLink = {
  labelTh: string
  labelEn: string
  labelZh?: string
  to: string
}

type Props = {
  kind?: HttpErrorKind
  code?: number
  errorMessage?: string
  showRetry?: boolean
  showSupport?: boolean
  homeTo?: string
  extraAction?: ActionLink
  className?: string
}

function Arrow() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2.5 9.5 L9.5 2.5 M5.5 2.5 H9.5 V6.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

function showsRetry(kind: HttpErrorKind, showRetry: boolean) {
  if (!showRetry) return false
  return kind === '500' || kind === '502' || kind === '503' || kind === 'generic'
}

function showsContact(kind: HttpErrorKind, showSupport: boolean) {
  if (!showSupport) return false
  return kind === '500' || kind === '502' || kind === 'generic'
}

export function HttpErrorPage({
  kind,
  code,
  errorMessage,
  showRetry = true,
  showSupport = true,
  homeTo = '/',
  extraAction,
  className,
}: Props) {
  const resolvedKind = resolveErrorKind(code, kind)
  const copy = HTTP_ERROR_COPY[resolvedKind]
  const displayCode = code ?? copy.code
  const heroRef = React.useRef<HTMLElement>(null)
  const codeRef = React.useRef<HTMLParagraphElement>(null)
  const waveRef = React.useRef<HTMLCanvasElement>(null)
  // Same language setting as the rest of the app (Settings → ภาษา).
  const [ui, setUi] = React.useState<AppLocale>(() => loadLocalePrefs().locale)
  const title = ui === 'th' ? copy.titleTh : ui === 'zh' ? copy.titleZh : copy.titleEn
  const pick = (w: keyof typeof WORDS) => WORDS[w][ui]
  const chooseLang = (code: AppLocale) => {
    setUi(code)
    try {
      saveLocalePrefs({ ...loadLocalePrefs(), locale: code })
    } catch {
      /* storage blocked: still switch on screen */
    }
  }

  React.useEffect(() => {
    const mine = heroRef.current
    if (!mine) return
    const hidden: HTMLElement[] = []
    const mark = (el: Element) => {
      if (!(el instanceof HTMLElement)) return
      // The screen itself stays live; only what is around it goes inert.
      if (el === mine) return
      if (el.contains(mine)) {
        for (const child of el.children) mark(child)
        return
      }
      el.setAttribute('inert', '')
      hidden.push(el)
    }
    for (const child of document.body.children) mark(child)
    return () => hidden.forEach((el) => el.removeAttribute('inert'))
  }, [])

  React.useEffect(() => {
    const root = heroRef.current
    const label = codeRef.current
    const canvas = waveRef.current
    if (!root || !label || !canvas || !displayCode) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    return startStatusCodeWave(root, label, canvas)
  }, [displayCode])

  const screen = (
    <main ref={heroRef} className={cn('status-screen', className)}>
      {displayCode ? (
        <>
          <p ref={codeRef} className="status-screen-code" aria-hidden="true">
            {displayCode}
          </p>
          <canvas ref={waveRef} className="status-screen-code-wave" aria-hidden="true" />
        </>
      ) : null}

      <div className="status-screen-panel">
        {/* Plain links (full page load): this screen can be the app's crash fallback, where in-app navigation would keep showing it. */}
        <a href={homeTo} className="status-screen-logo" aria-label={BRAND_NAME}>
          <BrandLogo tone="theme" size="sm" className="justify-center" />
        </a>
        <h1 lang={ui === 'zh' ? 'zh-CN' : ui}>{title}</h1>
        {errorMessage && errorMessage.length < 180 && !errorMessage.includes('\n') ? (
          <p className="sr-only">{errorMessage}</p>
        ) : null}
        <div className="status-screen-actions">
          <a className="status-screen-link" href={homeTo}>
            {pick('home')}
            <Arrow />
          </a>
          {showsRetry(resolvedKind, showRetry) ? (
            <button type="button" className="status-screen-link" onClick={() => window.location.reload()}>
              {pick('retry')}
              <Arrow />
            </button>
          ) : null}
          {extraAction ? (
            <a className="status-screen-link" href={extraAction.to}>
              {ui === 'th' ? extraAction.labelTh : ui === 'zh' ? extraAction.labelZh ?? extraAction.labelEn : extraAction.labelEn}
              <Arrow />
            </a>
          ) : null}
          {showsContact(resolvedKind, showSupport) ? (
            // Help centre (works without a mail app); the address is in the title for anyone who wants to write.
            <a className="status-screen-link" href="/help" title={BRAND_SUPPORT_EMAIL}>
              {pick('contact')}
              <Arrow />
            </a>
          ) : null}
        </div>
      </div>

      <footer className="status-screen-foot">
        <div className="status-screen-lang" role="group" aria-label="Language">
          {LANGS.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              aria-pressed={ui === code}
              className={ui === code ? 'is-on' : undefined}
              onClick={() => chooseLang(code)}
            >
              {label}
            </button>
          ))}
        </div>
      </footer>
    </main>
  )

  if (typeof document === 'undefined') return screen
  return createPortal(screen, document.body)
}
