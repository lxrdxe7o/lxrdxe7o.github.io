import { useMemo, lazy, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { useLocation } from '@tanstack/react-router'
import * as THREE from 'three'

// Lazy-load new scene presets
const SolarSystemScene = lazy(() => import('./presets/SolarSystemScene'))
const QuantumAtomScene = lazy(() => import('./presets/QuantumAtomScene'))
const WormholeScene = lazy(() => import('./presets/WormholeScene'))
const CrystalCavernScene = lazy(() => import('./presets/CrystalCavernScene'))
const DigitalMatrixScene = lazy(() => import('./presets/DigitalMatrixScene'))
const CrimsonVoidScene = lazy(() => import('./presets/CrimsonVoidScene'))
const PulsarScene = lazy(() => import('./presets/PulsarScene'))
const ConstellationScene = lazy(() => import('./presets/ConstellationScene'))
const BackgroundScene = lazy(() => import('./presets/BackgroundScene'))

const sceneComponents: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  '/': SolarSystemScene,
  '/about': QuantumAtomScene,
  '/projects': BackgroundScene,
  '/experience': WormholeScene,
  '/skills': CrystalCavernScene,
  '/uses': DigitalMatrixScene,
  '/notes': CrimsonVoidScene,
  '/now': PulsarScene,
  '/contact': ConstellationScene,
  '/blog': SolarSystemScene, // fallback
}

const CANVAS_CAMERA = { position: [0, 5, 15] as const, fov: 60 }
const CANVAS_GL = {
  antialias: true,
  toneMapping: THREE.ACESFilmicToneMapping,
  toneMappingExposure: 1.2,
}

type SceneComponent = React.ComponentType

export default function SceneEngine() {
  const { pathname } = useLocation()

  const SceneComponent = useMemo((): SceneComponent => {
    if (sceneComponents[pathname]) {
      return sceneComponents[pathname]
    }
    return sceneComponents['/'] || (() => null)
  }, [pathname])

  if (pathname === '/') {
    return null
  }

  // Render HTML/CSS scenes directly without Three.js Canvas
  const isHtmlScene = pathname === '/projects'

  if (isHtmlScene) {
    return (
      <div className="scene-container">
        <Suspense fallback={null}>
          <SceneComponent />
        </Suspense>
      </div>
    )
  }

  return (
    <div className="scene-container">
      <Canvas
        camera={CANVAS_CAMERA}
        dpr={[1, 2]}
        gl={CANVAS_GL}
      >
        <Suspense fallback={null}>
          <SceneComponent />
        </Suspense>
      </Canvas>
    </div>
  )
}