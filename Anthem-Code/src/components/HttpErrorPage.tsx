import * as React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Headphones, Home, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { BRAND_SUPPORT_EMAIL } from '@/lib/brandConfig'
import { HTTP_ERROR_COPY, resolveErrorKind, type HttpErrorKind } from '@/lib/httpErrorCopy'
import { cn } from '@/lib/utils'

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

  return (
    <div className={cn('relative min-h-screen overflow-hidden bg-background', className)}>
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-brand-radial opacity-40"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg text-center">
          <div className="flex justify-center mb-8">
            <BrandLogo size="md" />
          </div>

          <p
            className="text-[5.5rem] sm:text-[7rem] font-bold leading-none tracking-tighter text-gradient select-none"
            aria-hidden
          >
            {displayCode || '!'}
          </p>

          <h1 className="mt-6 text-xl sm:text-2xl font-semibold text-foreground" lang="th">
            {copy.titleTh}
          </h1>
          <p className="sr-only" lang="en">{copy.titleEn}</p>

          <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-md mx-auto" lang="th">
            {copy.descTh}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60 max-w-md mx-auto" lang="en" aria-hidden>
            {copy.descEn}
          </p>

          {errorMessage &&
            resolvedKind !== '404' &&
            resolvedKind !== 'token' && (
              <p className="mt-3 text-xs text-muted-foreground/60 break-words max-w-sm mx-auto font-mono bg-muted/50 rounded-md px-3 py-2 border border-border/50">
                {errorMessage}
              </p>
            )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            <Button asChild className="gap-1.5 shadow-sm">
              <Link to={homeTo}>
                <Home className="h-4 w-4" />
                <span>
                  กลับหน้าแรก
                  <span className="hidden sm:inline text-primary-foreground/80 font-normal">
                    {' '}· Home
                  </span>
                </span>
              </Link>
            </Button>

            {showRetry && (
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-4 w-4" />
                <span>
                  ลองใหม่
                  <span className="hidden sm:inline text-muted-foreground font-normal">
                    {' '}· Retry
                  </span>
                </span>
              </Button>
            )}

            {extraAction && (
              <Button variant="outline" asChild className="gap-1.5">
                <Link to={extraAction.to}>
                  <ArrowLeft className="h-4 w-4" />
                  <span>
                    {extraAction.labelTh}
                    <span className="hidden sm:inline text-muted-foreground font-normal">
                      {' '}· {extraAction.labelEn}
                    </span>
                  </span>
                </Link>
              </Button>
            )}

            {showSupport && (
              <Button
                variant="outline"
                className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                asChild
              >
                <a href={`mailto:${BRAND_SUPPORT_EMAIL}`}>
                  <Headphones className="h-4 w-4" />
                  <span>
                    ติดต่อทีมงาน
                    <span className="hidden sm:inline font-normal opacity-80"> · Support</span>
                  </span>
                </a>
              </Button>
            )}
          </div>

          {showSupport && copy.hintTh && (
            <p className="mt-8 text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed" lang="th">
              {copy.hintTh}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
