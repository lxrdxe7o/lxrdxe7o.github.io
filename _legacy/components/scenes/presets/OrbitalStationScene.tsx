import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { useIsMobile } from '@/hooks/useIsMobile'

// Color constants
const PRIMARY_COLOR = '#f97316'
const ACCENT_COLOR = '#fbbf24'

// Central Station Core Component
function StationCore() {
  const coreRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (coreRef.current) {
      coreRef.current.rotation.y = state.clock.elapsedTime * 0.1
    }
  })

  return (
    <group ref={coreRef}>
      {/* Main hexagonal core */}
      <mesh>
        <cylinderGeometry args={[2, 2.5, 1.5, 6]} />
        <meshStandardMaterial color={PRIMARY_COLOR} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Inner ring */}
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[2.8, 0.15, 16, 6]} />
        <meshStandardMaterial color={ACCENT_COLOR} emissive={PRIMARY_COLOR} emissiveIntensity={0.5} />
      </mesh>

      {/* Central glow */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial
          color={ACCENT_COLOR}
          emissive={PRIMARY_COLOR}
          emissiveIntensity={2}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Spokes from core */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh
          key={i}
          position={[
            Math.cos((i * Math.PI) / 3) * 1.5,
            0,
            Math.sin((i * Math.PI) / 3) * 1.5,
          ]}
          rotation={[Math.PI / 2, 0, (i * Math.PI) / 3]}
        >
          <boxGeometry args={[2, 0.2, 0.2]} />
          <meshStandardMaterial color={PRIMARY_COLOR} metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

// Orbiting Solar Panel
function SolarPanel({ orbitRadius, speed, size = 1 }: { orbitRadius: number; speed: number; size?: number }) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (groupRef.current) {
      const angle = state.clock.elapsedTime * speed
      groupRef.current.position.x = Math.cos(angle) * orbitRadius
      groupRef.current.position.z = Math.sin(angle) * orbitRadius
      groupRef.current.rotation.y = angle * 0.5
    }
  })

  return (
    <group ref={groupRef}>
      {/* Main panel */}
      <mesh>
        <boxGeometry args={[size * 3, 0.05, size]} />
        <meshStandardMaterial color={PRIMARY_COLOR} metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Panel frame */}
      <mesh position={[0, 0, size / 2]}>
        <boxGeometry args={[size * 3.2, 0.1, 0.1]} />
        <meshStandardMaterial color={ACCENT_COLOR} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0, -size / 2]}>
        <boxGeometry args={[size * 3.2, 0.1, 0.1]} />
        <meshStandardMaterial color={ACCENT_COLOR} metalness={0.7} />
      </mesh>

      {/* Solar cells pattern */}
      {[...Array(6)].map((_, i) => (
        <mesh key={i} position={[(i - 2.5) * 0.5, 0.03, 0]}>
          <boxGeometry args={[0.4, 0.02, size * 0.8]} />
          <meshStandardMaterial
            color={ACCENT_COLOR}
            emissive={PRIMARY_COLOR}
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
    </group>
  )
}

// Orbiting Module
function OrbitingModule({ orbitRadius, speed, tilt = 0 }: { orbitRadius: number; speed: number; tilt?: number }) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (groupRef.current) {
      const angle = state.clock.elapsedTime * speed
      groupRef.current.position.x = Math.cos(angle) * orbitRadius
      groupRef.current.position.y = Math.sin(angle) * orbitRadius * Math.sin(tilt)
      groupRef.current.position.z = Math.sin(angle) * orbitRadius * Math.cos(tilt)
      groupRef.current.rotation.x += 0.02
    }
  })

  return (
    <group ref={groupRef}>
      <mesh>
        <boxGeometry args={[0.8, 0.6, 1.2]} />
        <meshStandardMaterial color={ACCENT_COLOR} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Antenna */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.5]} />
        <meshStandardMaterial color={PRIMARY_COLOR} metalness={0.8} />
      </mesh>
    </group>
  )
}

// Laser Beam Connection
function LaserBeam({ start, end, color = PRIMARY_COLOR }: {
  start: [number, number, number]
  end: [number, number, number]
  color?: string
}) {
  const materialRef = useRef<THREE.LineBasicMaterial>(null)

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.opacity = 0.5 + Math.sin(state.clock.elapsedTime * 4) * 0.3
    }
  })

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={2}
          array={new Float32Array([...start, ...end])}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        ref={materialRef}
        color={color}
        transparent
        opacity={0.7}
      />
    </line>
  )
}

// Space Debris Particle
function DebrisParticle({ position, speed }: { position: [number, number, number]; speed: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const initialPos = useMemo(() => new THREE.Vector3(...position), [position])

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.x = initialPos.x + Math.sin(state.clock.elapsedTime * speed) * 2
      meshRef.current.position.y = initialPos.y + Math.cos(state.clock.elapsedTime * speed * 0.5) * 1.5
      meshRef.current.position.z = initialPos.z + Math.sin(state.clock.elapsedTime * speed * 0.7) * 2
      meshRef.current.rotation.x += 0.01
      meshRef.current.rotation.y += 0.015
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <dodecahedronGeometry args={[0.15, 0]} />
      <meshStandardMaterial color={PRIMARY_COLOR} roughness={0.8} />
    </mesh>
  )
}

// Floating Container
function FloatingContainer({ children, floatIntensity = 0.5 }: { children: React.ReactNode; floatIntensity?: number }) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * floatIntensity
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.3) * 0.1
    }
  })

  return <group ref={groupRef}>{children}</group>
}

// Main Scene Component
function OrbitalStationSceneComponents() {
  const isMobile = useIsMobile()
  const debrisPositions: [number, number, number][] = useMemo(() => [
    [5, 3, 2], [-4, 2, 5], [6, -2, -3], [-5, 1, -4],
    [3, 4, -5], [-3, -3, 4], [7, 0, 1], [-6, 2, -2],
    [4, -1, 6], [-7, -2, 3], [5, 3, -4], [-4, 1, -6],
  ], [])

  return (
    <>
      {/* Ambient and directional lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} color={ACCENT_COLOR} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color={PRIMARY_COLOR} />

      {/* Starfield background */}
      <Stars radius={100} depth={50} count={isMobile ? 1500 : 5000} factor={4} saturation={0} fade speed={1} />

      {/* Central orbital station */}
      <FloatingContainer>
        <StationCore />

        {/* Laser connections from core */}
        <LaserBeam start={[2.5, 0, 0]} end={[5, 0.5, 0]} />
        <LaserBeam start={[-2.5, 0, 0]} end={[-5, 0.5, 0]} />
        <LaserBeam start={[1.25, 0, 2.16]} end={[3, 0.3, 4]} />
        <LaserBeam start={[1.25, 0, -2.16]} end={[3, -0.3, -4]} />
        <LaserBeam start={[-1.25, 0, 2.16]} end={[-3, -0.3, 4]} />
        <LaserBeam start={[-1.25, 0, -2.16]} end={[-3, 0.3, -4]} />
      </FloatingContainer>

      {/* Orbiting solar panels */}
      <SolarPanel orbitRadius={6} speed={0.3} size={1.2} />
      <SolarPanel orbitRadius={7} speed={-0.2} size={0.8} />
      <SolarPanel orbitRadius={5.5} speed={0.5} size={1} />

      {/* Orbiting modules */}
      <OrbitingModule orbitRadius={8} speed={0.25} tilt={0.3} />
      <OrbitingModule orbitRadius={9} speed={-0.15} tilt={-0.4} />
      <OrbitingModule orbitRadius={6.5} speed={0.35} tilt={0.2} />

      {/* Space debris */}
      {debrisPositions.map((pos, i) => (
        <DebrisParticle key={i} position={pos} speed={0.5 + Math.random() * 0.5} />
      ))}

      {/* Camera controls */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={10}
        maxDistance={50}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </>
  )
}

// Export the scene body directly (Canvas is provided by SceneEngine)
export default function OrbitalStationScene() {
  return <OrbitalStationSceneComponents />
}

// Also export the inner component for direct use in SceneEngine
export { OrbitalStationSceneComponents }