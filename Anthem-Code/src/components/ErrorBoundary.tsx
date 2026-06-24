import * as React from 'react'
import { HttpErrorPage } from '@/components/HttpErrorPage'

type Props = { children: React.ReactNode }

type State = { hasError: boolean; message?: string }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
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
