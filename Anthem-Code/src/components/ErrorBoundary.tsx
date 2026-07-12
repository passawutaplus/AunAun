import * as React from 'react'
import { HttpErrorPage } from '@/components/HttpErrorPage'
import { isChunkLoadError } from '@/lib/lazyWithRetry'

type Props = { children: React.ReactNode }

type State = { hasError: boolean; message?: string; reloading?: boolean }

const CHUNK_RELOAD_KEY = 'aplus1_chunk_reload'

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    if (isChunkLoadError(error)) {
      try {
        if (!sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
          sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
          window.location.reload()
          return { hasError: true, message: error.message, reloading: true }
        }
      } catch {
        /* show error page */
      }
    }
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.reloading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">
          กำลังโหลดเวอร์ชันใหม่…
        </div>
      )
    }
    if (this.state.hasError) {
      return (
        <HttpErrorPage
          kind="500"
          errorMessage={this.state.message}
        />
      )
    }
    return this.props.children
  }
}
