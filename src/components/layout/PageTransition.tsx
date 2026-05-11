import { useEffect } from 'react'

interface PageTransitionProps {
  children: React.ReactNode
}

export default function PageTransition({ children }: PageTransitionProps) {
  useEffect(() => {
    document.documentElement.classList.add('page-entering')
    const timer = setTimeout(() => {
      document.documentElement.classList.remove('page-entering')
      document.documentElement.classList.add('page-entered')
    }, 50)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="page-transition-wrapper">
      {children}
    </div>
  )
}