import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ParticleFieldProps {
  count: number
}

export default function ParticleField({ count }: ParticleFieldProps) {
  const mesh = useRef<THREE.Points>(null!)
  const lastScrollRef = useRef(0)
  const scrollVelocityRef = useRef(0)
  const accumulatedRotationRef = useRef({ x: 0, y: 0 })
  const accumulatedTimeRef = useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY
      scrollVelocityRef.current = currentScroll - lastScrollRef.current
      lastScrollRef.current = currentScroll
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const [positions, colors, sizes] = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    const purpleBase = new THREE.Color('#a855f7')
    const pinkAccent = new THREE.Color('#ec4899')
    const blueAccent = new THREE.Color('#6366f1')

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const radius = Math.random() * 30 + 5
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i3 + 2] = radius * Math.cos(phi)

      const colorChoice = Math.random()
      const color = colorChoice < 0.5 ? purpleBase : colorChoice < 0.75 ? pinkAccent : blueAccent
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b

      sizes[i] = Math.random() * 3 + 0.5
    }

    return [positions, colors, sizes]
  }, [count])

  useFrame(() => {
    const velocity = scrollVelocityRef.current
    const isScrolling = Math.abs(velocity) > 0.1

    // Decay velocity when not actively scrolling
    scrollVelocityRef.current *= 0.9

    if (mesh.current) {
      if (isScrolling) {
        // Accumulate rotation based on scroll velocity
        accumulatedRotationRef.current.y += velocity * 0.002
        accumulatedRotationRef.current.x += velocity * 0.0005
        accumulatedTimeRef.current += Math.abs(velocity) * 0.01
      }

      // Apply accumulated rotations (particles stay where they stopped)
      mesh.current.rotation.y = accumulatedRotationRef.current.y
      mesh.current.rotation.x = Math.sin(accumulatedRotationRef.current.x) * 0.1

      const positionAttr = mesh.current.geometry.attributes.position
      const array = positionAttr.array as Float32Array

      for (let i = 0; i < count; i++) {
        const i3 = i * 3
        const originalY = positions[i3 + 1]
        // Use accumulated time for particle oscillation
        array[i3 + 1] = originalY + Math.sin(accumulatedTimeRef.current * 0.5 + i * 0.01) * 0.3
      }
      positionAttr.needsUpdate = true
    }
  })

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}
