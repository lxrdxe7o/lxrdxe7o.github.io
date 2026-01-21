import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface NucleonProps {
  position: [number, number, number]
  isProton: boolean
  scrollVelocityRef: React.MutableRefObject<number>
}

interface NucleonProps {
  position: [number, number, number]
  isProton: boolean
  scrollVelocityRef: React.MutableRefObject<number>
  isMobile?: boolean
}

function Nucleon({ position, isProton, scrollVelocityRef, isMobile = false }: NucleonProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const originalPos = useRef(position)
  const jitterRef = useRef({ x: 0, y: 0, z: 0 })

  const color = isProton ? '#ec4899' : '#8b5cf6'
  const emissiveColor = isProton ? '#be185d' : '#6d28d9'

  useFrame(() => {
    const velocity = scrollVelocityRef.current
    const isScrolling = Math.abs(velocity) > 0.1

    if (meshRef.current) {
      if (isScrolling) {
        // Quantum jitter effect - nucleons vibrate
        const jitterStrength = Math.min(Math.abs(velocity) * 0.008, 0.15)
        jitterRef.current.x += (Math.random() - 0.5) * jitterStrength
        jitterRef.current.y += (Math.random() - 0.5) * jitterStrength
        jitterRef.current.z += (Math.random() - 0.5) * jitterStrength
      }

      // Dampen jitter when not scrolling
      jitterRef.current.x *= 0.85
      jitterRef.current.y *= 0.85
      jitterRef.current.z *= 0.85

      meshRef.current.position.x = originalPos.current[0] + jitterRef.current.x
      meshRef.current.position.y = originalPos.current[1] + jitterRef.current.y
      meshRef.current.position.z = originalPos.current[2] + jitterRef.current.z
    }
  })

  // Reduce geometry detail on mobile
  const segments = isMobile ? 12 : 24

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.38, segments, segments]} />
      <meshStandardMaterial
        color={color}
        emissive={emissiveColor}
        emissiveIntensity={0.4}
        roughness={0.3}
        metalness={0.1}
      />
    </mesh>
  )
}

interface NucleusProps {
  scrollVelocityRef: React.MutableRefObject<number>
  nucleusPulseRef: React.MutableRefObject<number>
  isMobile?: boolean
}

function Nucleus({ scrollVelocityRef, nucleusPulseRef, isMobile = false }: NucleusProps) {
  const groupRef = useRef<THREE.Group>(null!)

  // Generate nucleon positions in a clustered sphere arrangement
  const nucleons = useMemo(() => {
    const particles: { position: [number, number, number]; isProton: boolean }[] = []

    // Center nucleon
    particles.push({ position: [0, 0, 0], isProton: true })

    // Inner shell - 6 nucleons in octahedral arrangement
    const innerRadius = 0.45
    const innerPositions: [number, number, number][] = [
      [innerRadius, 0, 0],
      [-innerRadius, 0, 0],
      [0, innerRadius, 0],
      [0, -innerRadius, 0],
      [0, 0, innerRadius],
      [0, 0, -innerRadius],
    ]
    innerPositions.forEach((pos, i) => {
      particles.push({ position: pos, isProton: i % 2 === 0 })
    })

    // Outer shell - 12 nucleons
    const outerRadius = 0.75
    for (let i = 0; i < 12; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / 12)
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5)
      particles.push({
        position: [
          outerRadius * Math.sin(phi) * Math.cos(theta),
          outerRadius * Math.sin(phi) * Math.sin(theta),
          outerRadius * Math.cos(phi),
        ],
        isProton: i % 2 === 1
      })
    }

    return particles
  }, [])

  useFrame(() => {
    if (groupRef.current) {
      const pulseScale = 1 + Math.sin(nucleusPulseRef.current) * 0.05
      groupRef.current.scale.setScalar(pulseScale)
    }
  })

  const glowSegments = isMobile ? 16 : 32

  return (
    <group ref={groupRef}>
      {/* Nucleons */}
      {nucleons.map((nucleon, index) => (
        <Nucleon
          key={index}
          position={nucleon.position}
          isProton={nucleon.isProton}
          scrollVelocityRef={scrollVelocityRef}
          isMobile={isMobile}
        />
      ))}

      {/* Inner glow */}
      <mesh>
        <sphereGeometry args={[1.4, glowSegments, glowSegments]} />
        <meshBasicMaterial
          color="#c084fc"
          transparent
          opacity={0.12}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[1.8, glowSegments, glowSegments]} />
        <meshBasicMaterial
          color="#a855f7"
          transparent
          opacity={0.06}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  )
}

interface ElectronRingProps {
  radius: number
  rotation: [number, number, number]
  electronCount: number
  color: string
  scrollVelocityRef: React.MutableRefObject<number>
  speed: number
  isMobile?: boolean
}

function ElectronRing({
  radius,
  rotation,
  electronCount,
  color,
  scrollVelocityRef,
  speed,
  isMobile = false
}: ElectronRingProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const electronsRef = useRef<THREE.Group>(null!)
  const localAngleRef = useRef(Math.random() * Math.PI * 2)

  useFrame(() => {
    const velocity = scrollVelocityRef.current
    const isScrolling = Math.abs(velocity) > 0.1

    if (isScrolling) {
      localAngleRef.current += velocity * 0.003 * speed
    }

    if (electronsRef.current) {
      electronsRef.current.rotation.z = localAngleRef.current
    }
  })

  // Reduce geometry detail on mobile
  const torusSegments = isMobile ? 8 : 16
  const torusRadialSegments = isMobile ? 50 : 100
  const electronSegments = isMobile ? 8 : 16

  return (
    <group ref={groupRef} rotation={rotation}>
      {/* Orbital ring */}
      <mesh>
        <torusGeometry args={[radius, 0.02, torusSegments, torusRadialSegments]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>

      {/* Electrons */}
      <group ref={electronsRef}>
        {Array.from({ length: electronCount }).map((_, i) => {
          const angle = (i / electronCount) * Math.PI * 2
          return (
            <mesh
              key={i}
              position={[
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                0
              ]}
            >
              <sphereGeometry args={[0.15, electronSegments, electronSegments]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={2}
                toneMapped={false}
              />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

interface SingleAtomProps {
  scale?: number
  position?: [number, number, number]
  scrollVelocityRef: React.MutableRefObject<number>
  nucleusPulseRef: React.MutableRefObject<number>
  orbitAngleRef?: React.MutableRefObject<number>
  orbitRadius?: number
  orbitSpeed?: number
  angleOffset?: number
  isMobile?: boolean
}

function SingleAtom({
  scale = 1,
  position = [0, 0, 0],
  scrollVelocityRef,
  nucleusPulseRef,
  orbitAngleRef,
  orbitRadius = 0,
  orbitSpeed = 1,
  angleOffset = 0,
  isMobile = false
}: SingleAtomProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const localRotationRef = useRef({ x: 0, y: 0 })

  // Reduce number of electron rings on mobile (3 instead of 6)
  const allRings = [
    { radius: 2.5, rotation: [0, 0, 0] as [number, number, number], electronCount: 2, color: '#a855f7', speed: 1.2 },
    { radius: 3.5, rotation: [Math.PI / 2, 0, 0] as [number, number, number], electronCount: 2, color: '#c084fc', speed: 1.1 },
    { radius: 4.5, rotation: [Math.PI / 3, 0, Math.PI / 6] as [number, number, number], electronCount: 3, color: '#ec4899', speed: 0.9 },
    { radius: 5.5, rotation: [0, Math.PI / 2, Math.PI / 4] as [number, number, number], electronCount: 3, color: '#f472b6', speed: 0.8 },
    { radius: 6.5, rotation: [-Math.PI / 4, Math.PI / 4, 0] as [number, number, number], electronCount: 4, color: '#6366f1', speed: 0.7 },
    { radius: 7.5, rotation: [Math.PI / 5, -Math.PI / 3, Math.PI / 8] as [number, number, number], electronCount: 4, color: '#818cf8', speed: 0.6 },
  ]

  const rings = isMobile ? allRings.slice(0, 3) : allRings

  useFrame(() => {
    const velocity = scrollVelocityRef.current
    const isScrolling = Math.abs(velocity) > 0.1

    if (groupRef.current) {
      // Update local rotation
      if (isScrolling) {
        localRotationRef.current.y += velocity * 0.002 * orbitSpeed
        localRotationRef.current.x += velocity * 0.0005 * orbitSpeed
      }

      groupRef.current.rotation.y = localRotationRef.current.y
      groupRef.current.rotation.x = Math.sin(localRotationRef.current.x) * 0.3

      // Orbit around center if orbitAngleRef is provided
      if (orbitAngleRef && orbitRadius > 0) {
        const angle = orbitAngleRef.current * orbitSpeed + angleOffset
        groupRef.current.position.x = position[0] + Math.cos(angle) * orbitRadius
        groupRef.current.position.y = position[1] + Math.sin(angle * 0.7) * (orbitRadius * 0.3)
        groupRef.current.position.z = position[2] + Math.sin(angle) * orbitRadius
      }
    }
  })

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <Nucleus
        scrollVelocityRef={scrollVelocityRef}
        nucleusPulseRef={nucleusPulseRef}
        isMobile={isMobile}
      />

      {rings.map((ring, index) => (
        <ElectronRing
          key={index}
          radius={ring.radius}
          rotation={ring.rotation}
          electronCount={ring.electronCount}
          color={ring.color}
          scrollVelocityRef={scrollVelocityRef}
          speed={ring.speed}
          isMobile={isMobile}
        />
      ))}
    </group>
  )
}

interface AtomProps {
  isMobile?: boolean
}

export default function Atom({ isMobile = false }: AtomProps) {
  const lastScrollRef = useRef(0)
  const scrollVelocityRef = useRef(0)
  const nucleusPulseRef = useRef(0)
  const orbitAngleRef = useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY
      scrollVelocityRef.current = currentScroll - lastScrollRef.current
      lastScrollRef.current = currentScroll
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useFrame(() => {
    const velocity = scrollVelocityRef.current
    const isScrolling = Math.abs(velocity) > 0.1

    // Decay velocity
    scrollVelocityRef.current *= 0.92

    if (isScrolling) {
      nucleusPulseRef.current += Math.abs(velocity) * 0.02
      orbitAngleRef.current += velocity * 0.003
    }
  })

  // Small atoms orbiting around the main atom - reduce from 9 to 4 on mobile
  const allSmallAtoms = [
    { scale: 0.25, orbitRadius: 12, orbitSpeed: 0.8 },
    { scale: 0.18, orbitRadius: 14, orbitSpeed: 0.8 },
    { scale: 0.22, orbitRadius: 16, orbitSpeed: 0.8 },
    { scale: 0.15, orbitRadius: 11, orbitSpeed: 0.8 },
    { scale: 0.20, orbitRadius: 18, orbitSpeed: 0.8 },
    { scale: 0.12, orbitRadius: 13, orbitSpeed: 0.8 },
    { scale: 0.17, orbitRadius: 15, orbitSpeed: 0.8 },
    { scale: 0.14, orbitRadius: 17, orbitSpeed: 0.8 },
    { scale: 0.19, orbitRadius: 12, orbitSpeed: 0.8 },
  ]

  const atomsToRender = isMobile ? allSmallAtoms.slice(0, 4) : allSmallAtoms
  const atomCount = atomsToRender.length

  const smallAtoms = atomsToRender.map((atom, index) => ({
    ...atom,
    angleOffset: (index / atomCount) * Math.PI * 2, // Equally spaced around the circle
  }))

  return (
    <group>
      {/* Main central atom */}
      <SingleAtom
        scale={1}
        scrollVelocityRef={scrollVelocityRef}
        nucleusPulseRef={nucleusPulseRef}
        isMobile={isMobile}
      />

      {/* Smaller orbiting atoms */}
      {smallAtoms.map((atom, index) => (
        <SingleAtom
          key={index}
          scale={atom.scale}
          scrollVelocityRef={scrollVelocityRef}
          nucleusPulseRef={nucleusPulseRef}
          orbitAngleRef={orbitAngleRef}
          orbitRadius={atom.orbitRadius}
          orbitSpeed={atom.orbitSpeed}
          angleOffset={atom.angleOffset}
          isMobile={isMobile}
        />
      ))}
    </group>
  )
}
