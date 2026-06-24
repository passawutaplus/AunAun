import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { HttpErrorPage } from '@/components/HttpErrorPage'

const NotFound = () => {
  const location = useLocation()

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname)
  }, [location.pathname])

  return <HttpErrorPage kind="404" />
}

export default NotFound
