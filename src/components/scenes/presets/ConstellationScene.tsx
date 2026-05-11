import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'

// Color constants
const PINK = '#ec4899'
const FUCHSIA = '#d946ef'
const PINK_EMISSIVE = '#be185d'
const FUCHSIA_EMISSIVE = '#a21caf'

// ============================================================================
// CONSTELLATION NODE COMPONENT
// ============================================================================

interface ConstellationNodeProps {
  position: [number, number, number]
  isInteractive?: boolean
  label?: string
}

function ConstellationNode({ position, isInteractive = false, label: _label }: ConstellationNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const originalScale = useRef(1)

  const color = hovered ? FUCHSIA : PINK
  const emissiveColor = hovered ? FUCHSIA_EMISSIVE : PINK_EMISSIVE
  const emissiveIntensity = hovered ? 2.5 : 1.2
  const scale = hovered ? 1.4 : originalScale.current

  useFrame((state) => {
    if (meshRef.current) {
      // Subtle pulsing animation
      const pulse = Math.sin(state.clock.elapsedTime * 2 + position[0] * 10) * 0.05
      meshRef.current.scale.setScalar(scale + pulse)
      
      // Gentle floating motion
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5 + position[0]) * 0.1
    }
  })

  return (
    <group position={position}>
      {/* Main node sphere */}
      <mesh
        ref={meshRef}
        onPointerOver={() => isInteractive && setHovered(true)}
        onPointerOut={() => isInteractive && setHovered(false)}
      >
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          roughness={0.2}
          metalness={0.4}
          toneMapped={false}
        />
      </mesh>

      {/* Inner glow core */}
      <mesh scale={0.5}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshBasicMaterial
          color={FUCHSIA}
          transparent
          opacity={hovered ? 0.8 : 0.5}
        />
      </mesh>

      {/* Outer glow ring */}
      <mesh scale={1.2}>
        <ringGeometry args={[0.2, 0.25, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={hovered ? 0.6 : 0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

// ============================================================================
// PULSING ENERGY PULSE ALONG CONNECTION LINE
// ============================================================================

interface EnergyPulseProps {
  start: [number, number, number]
  end: [number, number, number]
  delay: number
}

function EnergyPulse({ start, end, delay }: EnergyPulseProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const direction = useMemo(() => {
    return new THREE.Vector3(
      end[0] - start[0],
      end[1] - start[1],
      end[2] - start[2]
    ).normalize()
  }, [start, end])

  const length = useMemo(() => {
    return new THREE.Vector3(...end).distanceTo(new THREE.Vector3(...start))
  }, [start, end])

  useFrame((state) => {
    if (meshRef.current) {
      const t = ((state.clock.elapsedTime * 0.8 + delay) % 1)
      const pos = t * 0.8 // Travel 80% of the line, then reset
      
      meshRef.current.position.set(
        start[0] + direction.x * pos * length,
        start[1] + direction.y * pos * length,
        start[2] + direction.z * pos * length
      )

      // Fade out as it travels
      const opacity = t < 0.7 ? 1 : (1 - t) / 0.3
      ;(meshRef.current.material as THREE.MeshBasicMaterial).opacity = opacity
    }
  })

  return (
    <mesh ref={meshRef} position={start}>
      <sphereGeometry args={[0.06, 16, 16]} />
      <meshBasicMaterial
        color={FUCHSIA}
        transparent
        opacity={1}
        toneMapped={false}
      />
    </mesh>
  )
}

// ============================================================================
// CONNECTION LINE BETWEEN NODES
// ============================================================================

interface ConnectionLineProps {
  start: [number, number, number]
  end: [number, number, number]
  opacity?: number
}

function ConnectionLine({ start, end, opacity = 0.4 }: ConnectionLineProps) {
  const materialRef = useRef<THREE.LineBasicMaterial>(null)

  useFrame((state) => {
    if (materialRef.current) {
      // Subtle pulsing of the line
      materialRef.current.opacity = opacity + Math.sin(state.clock.elapsedTime * 1.5 + start[0] * 5) * 0.2
    }
  })

  const points = useMemo(() => {
    return [new THREE.Vector3(...start), new THREE.Vector3(...end)]
  }, [start, end])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    return geo
  }, [points])

  return (
    // @ts-expect-error - R3F Three.js <line> element conflicts with SVG <line> types
    <line geometry={geometry}>
      <lineBasicMaterial
        ref={materialRef}
        color={PINK}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
      />
    </line>
  )
}

// ============================================================================
// FLOATING CONTACT NODE (Interactive element)
// ============================================================================

interface ContactNodeProps {
  position: [number, number, number]
  label: string
  icon: string
}

function ContactNode({ position, label: _label, icon: _icon }: ContactNodeProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)

  useFrame((state) => {
    if (groupRef.current) {
      // Gentle rotation
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.3
      
      // Floating motion
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.8 + position[0]) * 0.15
    }
  })

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Outer ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.02, 16, 64]} />
        <meshStandardMaterial
          color={hovered ? FUCHSIA : PINK}
          emissive={hovered ? FUCHSIA_EMISSIVE : PINK_EMISSIVE}
          emissiveIntensity={hovered ? 2 : 1}
        />
      </mesh>

      {/* Inner glowing core */}
      <mesh scale={hovered ? 1.3 : 1}>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshStandardMaterial
          color={FUCHSIA}
          emissive={FUCHSIA_EMISSIVE}
          emissiveIntensity={hovered ? 4 : 2}
          toneMapped={false}
        />
      </mesh>

      {/* Pulsing ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.7, 0.01, 8, 32]} />
        <meshBasicMaterial
          color={PINK}
          transparent
          opacity={hovered ? 0.8 : 0.4}
        />
      </mesh>
    </group>
  )
}

// ============================================================================
// STAR FIELD BACKGROUND
// ============================================================================

function StarField() {
  const particlesRef = useRef<THREE.Points>(null)
  const count = 1500

  const { positions, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const radius = 30 + Math.random() * 70
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      sizes[i] = Math.random() * 0.06 + 0.02
    }

    return { positions, sizes }
  }, [])

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.01
      particlesRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.005) * 0.1
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
        color={PINK}
        size={0.04}
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
// AMBIENT FLOATING PARTICLES
// ============================================================================

function AmbientParticles() {
  const groupRef = useRef<THREE.Group>(null)
  const particleCount = 80

  const particles = useMemo(() => {
    return Array.from({ length: particleCount }, () => ({
      position: [
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 25,
      ] as [number, number, number],
      speed: Math.random() * 0.3 + 0.1,
      offset: Math.random() * Math.PI * 2,
      size: Math.random() * 0.03 + 0.01,
    }))
  }, [particleCount])

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.02
    }
  })

  return (
    <group ref={groupRef}>
      {particles.map((particle, i) => (
        <mesh
          key={i}
          position={particle.position}
        >
          <sphereGeometry args={[particle.size, 8, 8]} />
          <meshBasicMaterial
            color={i % 2 === 0 ? PINK : FUCHSIA}
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}
    </group>
  )
}

// ============================================================================
// MAIN CONSTELLATION SCENE COMPONENT
// ============================================================================

function ConstellationSceneComponents() {
  // Define constellation nodes positions (connected network pattern)
  const constellationNodes = useMemo(() => [
    // Central cluster
    { position: [0, 0, 0] as [number, number, number], label: 'Central Hub' },
    { position: [3, 1, 2] as [number, number, number], label: 'Node A' },
    { position: [-2.5, 0.5, 3] as [number, number, number], label: 'Node B' },
    { position: [1, -2, 4] as [number, number, number], label: 'Node C' },
    { position: [-3, -1, 1] as [number, number, number], label: 'Node D' },
    { position: [2, 2, -2] as [number, number, number], label: 'Node E' },
    { position: [-1, 3, -1] as [number, number, number], label: 'Node F' },
    // Outer nodes
    { position: [5, 0, 0] as [number, number, number], label: 'Outer A' },
    { position: [-5, 1, -2] as [number, number, number], label: 'Outer B' },
    { position: [0, -4, 2] as [number, number, number], label: 'Outer C' },
    { position: [4, -2, -3] as [number, number, number], label: 'Outer D' },
    { position: [-4, 2, -4] as [number, number, number], label: 'Outer E' },
  ], [])

  // Define connections between nodes
  const connections = useMemo(() => [
    // From central hub
    [[0, 0, 0], [3, 1, 2]],
    [[0, 0, 0], [-2.5, 0.5, 3]],
    [[0, 0, 0], [1, -2, 4]],
    [[0, 0, 0], [-3, -1, 1]],
    [[0, 0, 0], [2, 2, -2]],
    [[0, 0, 0], [-1, 3, -1]],
    // Secondary connections
    [[3, 1, 2], [5, 0, 0]],
    [[-2.5, 0.5, 3], [-5, 1, -2]],
    [[1, -2, 4], [0, -4, 2]],
    [[-3, -1, 1], [-4, 2, -4]],
    [[2, 2, -2], [4, -2, -3]],
    [[-1, 3, -1], [-4, 2, -4]],
    // Cross connections
    [[3, 1, 2], [1, -2, 4]],
    [[-2.5, 0.5, 3], [-3, -1, 1]],
    [[2, 2, -2], [-1, 3, -1]],
  ], [])

  // Contact nodes (interactive contact options)
  const contactNodes = useMemo(() => [
    { position: [6, 2, 3] as [number, number, number], label: 'Email', icon: '✉' },
    { position: [-6, -2, 4] as [number, number, number], label: 'GitHub', icon: '⌥' },
    { position: [4, -3, -5] as [number, number, number], label: 'LinkedIn', icon: '⬡' },
  ], [])

  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[15, 15, 15]} intensity={1} color={FUCHSIA} />
      <pointLight position={[-15, -15, -15]} intensity={0.5} color={PINK} />

      {/* Background stars */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0.5} fade speed={1} />
      
      {/* Additional star field layer */}
      <StarField />

      {/* Ambient particles */}
      <AmbientParticles />

      {/* Constellation network lines */}
      {connections.map((conn, i) => (
        <ConnectionLine key={i} start={conn[0] as [number, number, number]} end={conn[1] as [number, number, number]} opacity={0.5} />
      ))}

      {/* Energy pulses traveling along lines */}
      {connections.map((conn, i) => (
        <EnergyPulse
          key={`pulse-${i}`}
          start={conn[0] as [number, number, number]}
          end={conn[1] as [number, number, number]}
          delay={i * 0.15}
        />
      ))}

      {/* Constellation nodes */}
      {constellationNodes.map((node, i) => (
        <ConstellationNode
          key={i}
          position={node.position}
          label={node.label}
          isInteractive={i % 3 === 0}
        />
      ))}

      {/* Contact nodes (interactive) */}
      {contactNodes.map((node, i) => (
        <ContactNode
          key={i}
          position={node.position}
          label={node.label}
          icon={node.icon}
        />
      ))}

      {/* Camera controls */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={12}
        maxDistance={50}
        autoRotate
        autoRotateSpeed={0.4}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  )
}

// ============================================================================
// EXPORT DEFAULT COMPONENT
// ============================================================================

// Export the scene body directly (Canvas is provided by SceneEngine)
export default function ConstellationScene() {
  return <ConstellationSceneComponents />
}

// Also export the inner component for direct use in SceneEngine
export { ConstellationSceneComponents }