import { Canvas } from '@react-three/fiber'
import { Suspense, useMemo, useState, useEffect } from 'react'
import SolarSystem from './SolarSystem'
import AbyssBackground from './AbyssBackground'

// Responsive mobile detection hook
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     window.innerWidth < 768
      setIsMobile(mobile)
    }

    // Initial check
    checkMobile()

    // Add resize listener
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
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
  const mobile = useIsMobile()
  const lowEnd = useMemo(() => isLowEndDevice(), [])

  // Adjust settings based on device capabilities
  const dpr: [number, number] = mobile ? [1, 1.5] : [1, 2]
  const antialias = !lowEnd

  // Camera settings - move back on mobile to see more
  const cameraPosition: [number, number, number] = mobile ? [0, 5, 50] : [0, 5, 35]
  const fov = mobile ? 75 : 65

  return (
    <div className="scene-container">
      <Canvas
        camera={{ position: cameraPosition, fov }}
        gl={{ antialias, alpha: false, powerPreference: mobile ? 'low-power' : 'high-performance' }}
        dpr={dpr}
        performance={{ min: mobile ? 0.5 : 0.75 }}
      >
        <Suspense fallback={null}>
          <AbyssBackground isMobile={mobile} isLowEnd={lowEnd} />
          <ambientLight intensity={0.03} color="#FFFFFF" />
          {/* Main light source is now inside the Sun in SolarSystem.tsx */}
          <SolarSystem isMobile={mobile} />
        </Suspense>
      </Canvas>
    </div>
  )
}
