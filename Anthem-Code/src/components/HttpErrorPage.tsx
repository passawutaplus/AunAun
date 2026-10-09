import * as React from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { BRAND_NAME, BRAND_SUPPORT_EMAIL } from '@/lib/brandConfig'
import { startStatusCodeWave } from '@/components/statusCodeWave'
import { HTTP_ERROR_COPY, resolveErrorKind, type HttpErrorKind } from '@/lib/httpErrorCopy'
import { cn } from '@/lib/utils'

const LANG_KEY = 'aplus1-status-lang'

type ActionLink = {
  labelTh: string
  labelEn: string
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
  const [ui, setUi] = React.useState<'en' | 'th'>('en')
  const homeLabel = ui === 'th' ? 'หน้าแรก' : 'Home'
  const retryLabel = ui === 'th' ? 'ลองใหม่' : 'Retry'
  const contactLabel = ui === 'th' ? 'ติดต่อ' : 'Contact'

  React.useEffect(() => {
    const stored = localStorage.getItem(LANG_KEY)
    if (stored === 'th' || stored === 'en') setUi(stored)
  }, [])

  React.useEffect(() => {
    const mine = heroRef.current
    if (!mine) return
    const hidden: HTMLElement[] = []
    const mark = (el: Element) => {
      if (!(el instanceof HTMLElement)) return
      if (el === mine || el.contains(mine)) {
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
        <Link to={homeTo} className="status-screen-logo" aria-label={BRAND_NAME}>
          {BRAND_NAME}
        </Link>
        <h1>{copy.titleEn}</h1>
        {errorMessage && errorMessage.length < 180 && !errorMessage.includes('\n') ? (
          <p className="sr-only">{errorMessage}</p>
        ) : null}
        <div className="status-screen-actions">
          <Link className="status-screen-link" to={homeTo}>
            {homeLabel}
            <Arrow />
          </Link>
          {showsRetry(resolvedKind, showRetry) ? (
            <button type="button" className="status-screen-link" onClick={() => window.location.reload()}>
              {retryLabel}
              <Arrow />
            </button>
          ) : null}
          {extraAction ? (
            <Link className="status-screen-link" to={extraAction.to}>
              {ui === 'th' ? extraAction.labelTh : extraAction.labelEn}
              <Arrow />
            </Link>
          ) : null}
          {showsContact(resolvedKind, showSupport) ? (
            <a className="status-screen-link" href={`mailto:${BRAND_SUPPORT_EMAIL}`}>
              {contactLabel}
              <Arrow />
            </a>
          ) : null}
        </div>
      </div>

      <footer className="status-screen-foot">
        <div className="status-screen-lang" role="group" aria-label="Language">
          {(['en', 'th'] as const).map((code) => (
            <button
              key={code}
              type="button"
              aria-pressed={ui === code}
              className={ui === code ? 'is-on' : undefined}
              onClick={() => {
                setUi(code)
                localStorage.setItem(LANG_KEY, code)
              }}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </footer>
    </main>
  )

  if (typeof document === 'undefined') return screen
  return createPortal(screen, document.body)
}
