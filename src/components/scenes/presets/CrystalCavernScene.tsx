import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import * as THREE from 'three'
import { useIsMobile } from '@/hooks/useIsMobile'

// Color palette
const EMERALD = '#10b981'
const TEAL = '#14b8a6'
const EMERALD_DARK = '#047857'

// ============================================================================
// CRYSTAL COMPONENT
// ============================================================================

interface CrystalProps {
  position: [number, number, number]
  scale: number
  geometry: 'icosahedron' | 'octahedron' | 'dodecahedron'
  rotationSpeed?: number
  color: string
}

function Crystal({
  position,
  scale,
  geometry,
  rotationSpeed = 0.3,
  color
}: CrystalProps) {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * rotationSpeed
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.2
    }
  })

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
      <mesh ref={meshRef} position={position} scale={scale}>
        {geometry === 'icosahedron' && (
          <icosahedronGeometry args={[1, 0]} />
        )}
        {geometry === 'octahedron' && (
          <octahedronGeometry args={[1, 0]} />
        )}
        {geometry === 'dodecahedron' && (
          <dodecahedronGeometry args={[1, 0]} />
        )}
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
          roughness={0.1}
          metalness={0.2}
          transmission={0.6}
          thickness={1.5}
          transparent
          opacity={0.85}
          ior={2.4}
          envMapIntensity={1}
        />
      </mesh>
    </Float>
  )
}

// ============================================================================
// CRYSTAL CLUSTER COMPONENT
// ============================================================================

interface CrystalClusterProps {
  position: [number, number, number]
  count: number
  color: string
}

function CrystalCluster({ position, count, color }: CrystalClusterProps) {
  const crystals = useMemo(() => {
    return Array.from({ length: count }, () => {
      const scale = 0.15 + Math.random() * 0.4
      const geometries: ('icosahedron' | 'octahedron' | 'dodecahedron')[] = [
        'icosahedron', 'octahedron', 'dodecahedron'
      ]
      return {
        position: [
          (Math.random() - 0.5) * 2.5,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2.5
        ] as [number, number, number],
        scale,
        geometry: geometries[Math.floor(Math.random() * geometries.length)],
        rotationSpeed: 0.1 + Math.random() * 0.4
      }
    })
  }, [count])

  return (
    <group position={position}>
      {crystals.map((crystal, index) => (
        <Crystal
          key={index}
          position={crystal.position}
          scale={crystal.scale}
          geometry={crystal.geometry}
          rotationSpeed={crystal.rotationSpeed}
          color={color}
        />
      ))}
    </group>
  )
}

// ============================================================================
// FLOATING LIGHT ORB COMPONENT
// ============================================================================

interface LightOrbProps {
  position: [number, number, number]
  color: string
  intensity?: number
}

function LightOrb({ position, color, intensity = 0.8 }: LightOrbProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const lightRef = useRef<THREE.PointLight>(null!)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.3
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.15
      meshRef.current.scale.setScalar(scale)
    }
    if (lightRef.current) {
      lightRef.current.intensity = intensity + Math.sin(state.clock.elapsedTime * 3) * 0.3
    }
  })

  return (
    <Float speed={0.8} rotationIntensity={0.1} floatIntensity={0.4}>
      <group position={position}>
        <mesh ref={meshRef}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.9}
          />
        </mesh>
        <mesh scale={1.5}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.3}
          />
        </mesh>
        <pointLight
          ref={lightRef}
          color={color}
          intensity={intensity}
          distance={3}
          decay={2}
        />
      </group>
    </Float>
  )
}

// ============================================================================
// CAVERN WALL GLOW COMPONENT
// ============================================================================

function CavernGlow() {
  const groupRef = useRef<THREE.Group>(null!)

  const glowSpots = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * Math.PI * 2
      const radius = 12
      return {
        position: [
          Math.cos(angle) * radius,
          (Math.random() - 0.5) * 8,
          Math.sin(angle) * radius
        ] as [number, number, number],
        color: i % 2 === 0 ? EMERALD : TEAL,
        scale: 1 + Math.random() * 1.5
      }
    })
  }, [])

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.01
    }
  })

  return (
    <group ref={groupRef}>
      {glowSpots.map((spot, index) => (
        <mesh key={index} position={spot.position} scale={spot.scale}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial
            color={spot.color}
            transparent
            opacity={0.15}
            side={THREE.BackSide}
          />
        </mesh>
      ))}
    </group>
  )
}

// ============================================================================
// CRYSTAL STALACTITES COMPONENT
// ============================================================================

interface StalactiteProps {
  position: [number, number, number]
  length: number
  color: string
}

function Stalactite({ position, length, color }: StalactiteProps) {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.3 + position[0]) * 0.05
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <coneGeometry args={[0.08, length, 6]} />
      <meshPhysicalMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.3}
        roughness={0.2}
        metalness={0.3}
        transparent
        opacity={0.7}
        transmission={0.4}
      />
    </mesh>
  )
}

// ============================================================================
// BIOLUMINESCENT PARTICLES COMPONENT
// ============================================================================

interface ParticlesProps {
  isMobile?: boolean
}

function BioluminescentParticles({ isMobile = false }: ParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null!)
  const particleCount = isMobile ? 500 : 1000

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)

    const emeraldColor = new THREE.Color(EMERALD)
    const tealColor = new THREE.Color(TEAL)

    for (let i = 0; i < particleCount; i++) {
      // Distribute in a spherical shell (cavern-like)
      const radius = 5 + Math.random() * 15
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      // Mix between emerald and teal
      const mixFactor = Math.random()
      const color = emeraldColor.clone().lerp(tealColor, mixFactor)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    return { positions, colors }
  }, [particleCount])

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.01) * 0.1
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

// ============================================================================
// MAIN SCENE COMPONENT
// ============================================================================

interface CrystalCavernSceneProps {
  isMobile?: boolean
}

export default function CrystalCavernScene({ isMobile: isMobileProp = false }: CrystalCavernSceneProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const mobile = useIsMobile()
  const isMobile = isMobileProp || mobile

  // Crystal positions and configurations
  const crystals = useMemo(() => {
    const configs: {
      position: [number, number, number]
      scale: number
      geometry: 'icosahedron' | 'octahedron' | 'dodecahedron'
      color: string
    }[] = []

    // Main floating crystals
    const mainCrystalCount = isMobile ? 8 : 15
    for (let i = 0; i < mainCrystalCount; i++) {
      const angle = (i / mainCrystalCount) * Math.PI * 2
      const radius = 3 + Math.random() * 4
      const geometries: ('icosahedron' | 'octahedron' | 'dodecahedron')[] = [
        'icosahedron', 'octahedron', 'dodecahedron'
      ]
      configs.push({
        position: [
          Math.cos(angle) * radius,
          (Math.random() - 0.5) * 4,
          Math.sin(angle) * radius
        ],
        scale: 0.3 + Math.random() * 0.6,
        geometry: geometries[Math.floor(Math.random() * geometries.length)],
        color: Math.random() > 0.5 ? EMERALD : TEAL
      })
    }

    return configs
  }, [isMobile])

  // Crystal clusters
  const clusters = useMemo(() => {
    const clusterCount = isMobile ? 3 : 6
    return Array.from({ length: clusterCount }, (_, i) => {
      const angle = (i / clusterCount) * Math.PI * 2
      const radius = 6 + Math.random() * 3
      return {
        position: [
          Math.cos(angle) * radius,
          -2 + Math.random() * 2,
          Math.sin(angle) * radius
        ] as [number, number, number],
        count: 4 + Math.floor(Math.random() * 4),
        color: i % 2 === 0 ? EMERALD : TEAL
      }
    })
  }, [isMobile])

  // Light orbs
  const orbs = useMemo(() => {
    const orbCount = isMobile ? 5 : 10
    return Array.from({ length: orbCount }, (_, i) => {
      const angle = (i / orbCount) * Math.PI * 2
      const radius = 2 + Math.random() * 5
      return {
        position: [
          Math.cos(angle) * radius,
          (Math.random() - 0.5) * 6,
          Math.sin(angle) * radius
        ] as [number, number, number],
        color: i % 2 === 0 ? EMERALD : TEAL,
        intensity: 0.5 + Math.random() * 0.5
      }
    })
  }, [isMobile])

  // Stalactites
  const stalactites = useMemo(() => {
    const count = isMobile ? 20 : 40
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2
      const radius = 10 + Math.random() * 4
      return {
        position: [
          Math.cos(angle) * radius,
          8 + Math.random() * 2,
          Math.sin(angle) * radius
        ] as [number, number, number],
        length: 0.8 + Math.random() * 1.5,
        color: i % 2 === 0 ? EMERALD_DARK : TEAL
      }
    })
  }, [isMobile])

  // Ambient light
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.008
    }
  })

  return (
    <group ref={groupRef}>
      {/* Ambient lighting */}
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 5, 0]} color={EMERALD} intensity={1.5} distance={20} />
      <pointLight position={[0, -5, 0]} color={TEAL} intensity={1} distance={15} />

      {/* Main floating crystals */}
      {crystals.map((crystal, index) => (
        <Crystal
          key={`main-${index}`}
          position={crystal.position}
          scale={crystal.scale}
          geometry={crystal.geometry}
          color={crystal.color}
        />
      ))}

      {/* Crystal clusters */}
      {clusters.map((cluster, index) => (
        <CrystalCluster
          key={`cluster-${index}`}
          position={cluster.position}
          count={cluster.count}
          color={cluster.color}
        />
      ))}

      {/* Floating light orbs */}
      {orbs.map((orb, index) => (
        <LightOrb
          key={`orb-${index}`}
          position={orb.position}
          color={orb.color}
          intensity={orb.intensity}
        />
      ))}

      {/* Stalactites from ceiling */}
      {stalactites.map((stalactite, index) => (
        <Stalactite
          key={`stalactite-${index}`}
          position={stalactite.position}
          length={stalactite.length}
          color={stalactite.color}
        />
      ))}

      {/* Cavern glow effects */}
      <CavernGlow />

      {/* Bioluminescent particles */}
      <BioluminescentParticles isMobile={isMobile} />
    </group>
  )
}