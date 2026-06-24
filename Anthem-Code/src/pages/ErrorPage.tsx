import { useSearchParams } from 'react-router-dom'
import { HttpErrorPage } from '@/components/HttpErrorPage'
import type { HttpErrorKind } from '@/lib/httpErrorCopy'

const ALLOWED: HttpErrorKind[] = ['404', '405', '500', '503', 'generic', 'token']

type Props = { defaultKind?: HttpErrorKind }

const ErrorPage = ({ defaultKind = 'generic' }: Props) => {
  const [params] = useSearchParams()
  const raw = params.get('kind') as HttpErrorKind | null
  const kind = raw && ALLOWED.includes(raw) ? raw : defaultKind
  const code = Number(params.get('code')) || undefined
  const message = params.get('msg') ?? undefined

  return <HttpErrorPage kind={kind} code={code} errorMessage={message} />
}

export default ErrorPage
