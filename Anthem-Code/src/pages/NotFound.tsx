import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { HttpErrorPage } from '@/components/HttpErrorPage'
import SeoHead from '@/components/SeoHead'

const NotFound = () => {
  const location = useLocation()

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname)
  }, [location.pathname])

  return (
    <>
      <SeoHead
        path={location.pathname}
        noindex
        title="ไม่พบหน้า"
        description="หน้าที่คุณค้นหาไม่มีบน SAMECOR"
      />
      <HttpErrorPage kind="404" />
    </>
  )
}

export default NotFound
