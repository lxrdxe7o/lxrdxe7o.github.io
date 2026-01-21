import { Canvas } from '@react-three/fiber'
import { Suspense, useMemo } from 'react'
import Atom from './Atom'
import AbyssBackground from './AbyssBackground'

// Detect mobile device
const isMobile = () => {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         window.innerWidth < 768
}

// Detect low-end device (simplified check)
const isLowEndDevice = () => {
  if (typeof window === 'undefined') return false
  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // Check for low memory (if available)
  const lowMemory = (navigator as any).deviceMemory ? (navigator as any).deviceMemory < 4 : false
  return prefersReducedMotion || lowMemory
}

export default function Scene3D() {
  const mobile = useMemo(() => isMobile(), [])
  const lowEnd = useMemo(() => isLowEndDevice(), [])

  // Adjust settings based on device capabilities
  const dpr: [number, number] = mobile ? [1, 1.5] : [1, 2]
  const antialias = !lowEnd

  return (
    <div className="scene-container">
      <Canvas
        camera={{ position: [0, 0, 20], fov: 60 }}
        gl={{ antialias, alpha: false, powerPreference: mobile ? 'low-power' : 'high-performance' }}
        dpr={dpr}
        performance={{ min: mobile ? 0.5 : 0.75 }}
      >
        <Suspense fallback={null}>
          <AbyssBackground isMobile={mobile} isLowEnd={lowEnd} />
          <ambientLight intensity={0.3} color="#1a0515" />
          <pointLight position={[10, 10, 10]} intensity={1.8} color="#a855f7" />
          <pointLight position={[-10, -10, -10]} intensity={1.0} color="#ec4899" />
          {!mobile && <pointLight position={[0, 0, 15]} intensity={0.6} color="#c084fc" />}
          {!mobile && <pointLight position={[-15, 5, 5]} intensity={0.4} color="#7c3aed" />}
          <Atom isMobile={mobile} />
        </Suspense>
      </Canvas>
    </div>
  )
}
