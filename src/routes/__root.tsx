import {
  Outlet,
  createRootRoute,
} from '@tanstack/react-router'
import { Suspense, useEffect, useState } from 'react'
import SceneEngine from '@/components/scenes/SceneEngine'
import Navbar from '@/components/layout/Navbar'
import MobileMenu from '@/components/layout/MobileMenu'
import PageTransition from '@/components/layout/PageTransition'
import { useRouterState } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useRouterState({ select: s => s.location })

  // Update data-route attribute for CSS theming
  useEffect(() => {
    const path = location.pathname
    const routeName = path === '/' ? 'home' : path.split('/')[1]
    document.documentElement.setAttribute('data-route', routeName)
  }, [location.pathname])

  return (
    <div className="app-root">
      <SceneEngine />
      <Navbar onMenuToggle={() => setMobileMenuOpen(true)} />
      <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <main className="content">
        <PageTransition>
          <Suspense fallback={<div className="loading-screen"><div className="loader" /></div>}>
            <Outlet />
          </Suspense>
        </PageTransition>
      </main>
    </div>
  )
}