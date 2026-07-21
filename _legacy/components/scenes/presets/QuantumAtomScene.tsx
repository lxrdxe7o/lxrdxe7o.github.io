import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import * as THREE from 'three'
import { useIsMobile } from '@/hooks/useIsMobile'

// Color palette
const CYAN = '#22d3ee'
const BLUE = '#6366f1'
const CYAN_EMISSIVE = '#0891b2'
const BLUE_EMISSIVE = '#4338ca'

// ============================================================================
// PROTON/NEUTRON COMPONENTS
// ============================================================================

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

  const color = isProton ? CYAN : BLUE
  const emissiveColor = isProton ? CYAN_EMISSIVE : BLUE_EMISSIVE

  useFrame(() => {
    const velocity = scrollVelocityRef.current
    const isScrolling = Math.abs(velocity) > 0.1

    if (meshRef.current) {
      if (isScrolling) {
        const jitterStrength = Math.min(Math.abs(velocity) * 0.006, 0.12)
        jitterRef.current.x += (Math.random() - 0.5) * jitterStrength
        jitterRef.current.y += (Math.random() - 0.5) * jitterStrength
        jitterRef.current.z += (Math.random() - 0.5) * jitterStrength
      }

      jitterRef.current.x *= 0.88
      jitterRef.current.y *= 0.88
      jitterRef.current.z *= 0.88

      meshRef.current.position.x = originalPos.current[0] + jitterRef.current.x
      meshRef.current.position.y = originalPos.current[1] + jitterRef.current.y
      meshRef.current.position.z = originalPos.current[2] + jitterRef.current.z
    }
  })

  const segments = isMobile ? 12 : 20

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.32, segments, segments]} />
      <meshStandardMaterial
        color={color}
        emissive={emissiveColor}
        emissiveIntensity={0.6}
        roughness={0.25}
        metalness={0.15}
      />
    </mesh>
  )
}

// ============================================================================
// NUCLEUS COMPONENT
// ============================================================================

interface NucleusProps {
  scrollVelocityRef: React.MutableRefObject<number>
  pulseRef: React.MutableRefObject<number>
  isMobile?: boolean
}

function Nucleus({ scrollVelocityRef, pulseRef, isMobile = false }: NucleusProps) {
  const groupRef = useRef<THREE.Group>(null!)

  const nucleons = useMemo(() => {
    const particles: { position: [number, number, number]; isProton: boolean }[] = []

    // Center nucleon
    particles.push({ position: [0, 0, 0], isProton: true })

    // Inner shell - 6 nucleons in octahedral arrangement
    const innerRadius = 0.42
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

    // Outer shell - 10 nucleons
    const outerRadius = 0.68
    for (let i = 0; i < 10; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / 10)
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
      const pulseScale = 1 + Math.sin(pulseRef.current) * 0.04
      groupRef.current.scale.setScalar(pulseScale)
    }
  })

  const glowSegments = isMobile ? 16 : 28

  return (
    <group ref={groupRef}>
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
        <sphereGeometry args={[1.2, glowSegments, glowSegments]} />
        <meshBasicMaterial
          color={CYAN}
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[1.6, glowSegments, glowSegments]} />
        <meshBasicMaterial
          color={BLUE}
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Core glow */}
      <mesh>
        <sphereGeometry args={[0.8, glowSegments, glowSegments]} />
        <meshBasicMaterial
          color={CYAN}
          transparent
          opacity={0.25}
        />
      </mesh>
    </group>
  )
}

// ============================================================================
// ELECTRON RING COMPONENT
// ============================================================================

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

  const torusSegments = isMobile ? 6 : 12
  const torusRadialSegments = isMobile ? 60 : 120
  const electronSegments = isMobile ? 8 : 14

  return (
    <group rotation={rotation}>
      {/* Orbital ring */}
      <mesh>
        <torusGeometry args={[radius, 0.015, torusSegments, torusRadialSegments]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} />
      </mesh>

      {/* Electron trail ring */}
      <mesh>
        <torusGeometry args={[radius, 0.008, torusSegments, torusRadialSegments]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} />
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
              <sphereGeometry args={[0.12, electronSegments, electronSegments]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={2.5}
                toneMapped={false}
              />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

// ============================================================================
// MAIN ATOM COMPONENT
// ============================================================================

interface AtomCoreProps {
  scrollVelocityRef: React.MutableRefObject<number>
  pulseRef: React.MutableRefObject<number>
  isMobile?: boolean
}

function AtomCore({ scrollVelocityRef, pulseRef, isMobile = false }: AtomCoreProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const localRotationRef = useRef({ x: 0, y: 0 })

  const allRings = [
    { radius: 2.2, rotation: [0, 0, 0] as [number, number, number], electronCount: 2, color: CYAN, speed: 1.3 },
    { radius: 3.0, rotation: [Math.PI / 2, 0, 0] as [number, number, number], electronCount: 2, color: BLUE, speed: 1.1 },
    { radius: 3.8, rotation: [Math.PI / 3, 0, Math.PI / 6] as [number, number, number], electronCount: 3, color: CYAN, speed: 0.95 },
    { radius: 4.5, rotation: [0, Math.PI / 2, Math.PI / 4] as [number, number, number], electronCount: 3, color: BLUE, speed: 0.85 },
    { radius: 5.2, rotation: [-Math.PI / 4, Math.PI / 4, 0] as [number, number, number], electronCount: 4, color: CYAN, speed: 0.75 },
    { radius: 6.0, rotation: [Math.PI / 5, -Math.PI / 3, Math.PI / 8] as [number, number, number], electronCount: 4, color: BLUE, speed: 0.65 },
  ]

  const rings = isMobile ? allRings.slice(0, 4) : allRings

  useFrame(() => {
    const velocity = scrollVelocityRef.current
    const isScrolling = Math.abs(velocity) > 0.1

    if (groupRef.current) {
      if (isScrolling) {
        localRotationRef.current.y += velocity * 0.002
        localRotationRef.current.x += velocity * 0.0005
      }

      groupRef.current.rotation.y = localRotationRef.current.y
      groupRef.current.rotation.x = Math.sin(localRotationRef.current.x) * 0.25
    }
  })

  return (
    <group ref={groupRef}>
      <Nucleus
        scrollVelocityRef={scrollVelocityRef}
        pulseRef={pulseRef}
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

// ============================================================================
// QUANTUM PARTICLES (Background field)
// ============================================================================

interface QuantumFieldProps {
  isMobile?: boolean
}

function QuantumField({ isMobile = false }: QuantumFieldProps) {
  const particlesRef = useRef<THREE.Points>(null!)
  const count = isMobile ? 800 : 2000

  const { positions, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const radius = 8 + Math.random() * 25
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      sizes[i] = Math.random() * 0.08 + 0.02
    }

    return { positions, sizes }
  }, [count])

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.02
      particlesRef.current.rotation.x = state.clock.elapsedTime * 0.01
    }
  })

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
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
        color={CYAN}
        size={0.05}
        transparent
        opacity={0.4}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

// ============================================================================
// QUANTUM PROBABILITY CLOUD
// ============================================================================

interface ProbabilityCloudProps {
  isMobile?: boolean
}

function ProbabilityCloud({ isMobile = false }: ProbabilityCloudProps) {
  const meshRef = useRef<THREE.Points>(null!)

  const particleCount = isMobile ? 300 : 600

  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      const r = 2 + Math.random() * 8
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
    }
    return pos
  }, [particleCount])

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.05
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.03) * 0.1
    }
  })

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={BLUE}
        size={0.03}
        transparent
        opacity={0.3}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

// ============================================================================
// FLOATING ENERGY PARTICLES
// ============================================================================

interface EnergyParticlesProps {
  isMobile?: boolean
}

function EnergyParticles({ isMobile = false }: EnergyParticlesProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const particleCount = isMobile ? 50 : 120

  const particles = useMemo(() => {
    return Array.from({ length: particleCount }, () => ({
      position: [
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
      ] as [number, number, number],
      speed: Math.random() * 0.5 + 0.2,
      offset: Math.random() * Math.PI * 2,
    }))
  }, [particleCount])

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.015
    }
  })

  return (
    <group ref={groupRef}>
      {particles.map((particle, i) => (
        <Float
          key={i}
          speed={particle.speed}
          rotationIntensity={0.2}
          floatIntensity={0.5}
        >
          <mesh position={particle.position}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshBasicMaterial
              color={i % 2 === 0 ? CYAN : BLUE}
              transparent
              opacity={0.6}
            />
          </mesh>
        </Float>
      ))}
    </group>
  )
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

interface QuantumAtomSceneProps {
  isMobile?: boolean
}

export default function QuantumAtomScene({ isMobile = false }: QuantumAtomSceneProps) {
  const lastScrollRef = useRef(0)
  const scrollVelocityRef = useRef(0)
  const pulseRef = useRef(0)

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

    scrollVelocityRef.current *= 0.92

    if (isScrolling) {
      pulseRef.current += Math.abs(velocity) * 0.015
    }
  })

  const mobile = useIsMobile()
  const useMobile = isMobile || mobile

  return (
    <group>
      {/* Central Atom */}
      <AtomCore
        scrollVelocityRef={scrollVelocityRef}
        pulseRef={pulseRef}
        isMobile={useMobile}
      />

      {/* Quantum probability cloud around nucleus */}
      <ProbabilityCloud isMobile={useMobile} />

      {/* Background quantum field */}
      <QuantumField isMobile={useMobile} />

      {/* Floating energy particles */}
      <EnergyParticles isMobile={useMobile} />

      {/* Ambient lighting */}
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 0, 0]} color={CYAN} intensity={3} distance={50} />
      <pointLight position={[5, 5, 5]} color={BLUE} intensity={2} distance={40} />
      <pointLight position={[-5, -5, -5]} color={CYAN} intensity={1.5} distance={35} />
    </group>
  )
}