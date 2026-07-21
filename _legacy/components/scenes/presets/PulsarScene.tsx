import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useIsMobile } from '@/hooks/useIsMobile'

// Color palette
const YELLOW = '#eab308'
const LIME = '#84cc16'
const YELLOW_EMISSIVE = '#ca8a04'

// ============================================================================
// PULSAR CORE COMPONENT
// ============================================================================

function PulsarCore() {
  const coreRef = useRef<THREE.Mesh>(null!)
  const glowRef = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    const t = state.clock.elapsedTime

    if (coreRef.current) {
      // Pulsing scale effect
      const pulseScale = 1 + Math.sin(t * 3) * 0.08
      coreRef.current.scale.setScalar(pulseScale)
    }

    if (glowRef.current) {
      // Breathing glow effect
      const material = glowRef.current.material as THREE.MeshBasicMaterial
      material.opacity = 0.2 + Math.sin(t * 2) * 0.1
    }
  })

  return (
    <group>
      {/* Core sphere */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial
          color={YELLOW}
          emissive={YELLOW_EMISSIVE}
          emissiveIntensity={2}
          roughness={0.1}
          metalness={0.3}
        />
      </mesh>

      {/* Inner glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshBasicMaterial
          color={YELLOW}
          transparent
          opacity={0.25}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[0.9, 32, 32]} />
        <meshBasicMaterial
          color={LIME}
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  )
}

// ============================================================================
// ROTATING BEAM COMPONENT
// ============================================================================

function RotatingBeam({ rotation = 0, speed = 1 }: { rotation?: number; speed?: number }) {
  const beamRef = useRef<THREE.Group>(null!)
  const beamMeshRef = useRef<THREE.Mesh>(null!)
  const glowMeshRef = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed

    if (beamRef.current) {
      beamRef.current.rotation.y = t + rotation
      beamRef.current.rotation.z = Math.sin(t * 0.5) * 0.1
    }

    if (beamMeshRef.current) {
      const material = beamMeshRef.current.material as THREE.MeshBasicMaterial
      // Flickering effect
      const flicker = 0.7 + Math.sin(t * 8) * 0.2 + Math.sin(t * 13) * 0.1
      material.opacity = flicker * 0.8
    }

    if (glowMeshRef.current) {
      const material = glowMeshRef.current.material as THREE.MeshBasicMaterial
      material.opacity = 0.3 + Math.sin(t * 4) * 0.15
    }
  })

  return (
    <group ref={beamRef} rotation={[0, rotation, 0]}>
      {/* Main beam - elongated cone */}
      <mesh ref={beamMeshRef} position={[0, 1.5, 0]}>
        <coneGeometry args={[0.08, 3, 16, 1, true]} />
        <meshBasicMaterial
          color={YELLOW}
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Beam glow */}
      <mesh ref={glowMeshRef} position={[0, 1.5, 0]}>
        <coneGeometry args={[0.15, 3.2, 16, 1, true]} />
        <meshBasicMaterial
          color={LIME}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

// ============================================================================
// EXPANDING RIPPLES
// ============================================================================

interface RippleProps {
  delay: number
  speed: number
  maxRadius: number
}

function Ripple({ delay, speed, maxRadius }: RippleProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const phaseRef = useRef(delay)

  useFrame((state) => {
    if (!meshRef.current) return

    const t = state.clock.elapsedTime
    phaseRef.current = ((t + delay) * speed) % 1
    const phase = phaseRef.current

    // Scale from 0 to maxRadius
    const scale = phase * maxRadius
    meshRef.current.scale.setScalar(scale)

    // Fade out as it expands
    const material = meshRef.current.material as THREE.MeshBasicMaterial
    material.opacity = (1 - phase) * 0.4
  })

  return (
    <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[1, 0.03, 8, 64]} />
      <meshBasicMaterial
        color={LIME}
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  )
}

// ============================================================================
// PARTICLE TRAILS
// ============================================================================

function ParticleTrails({ count = 500 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null!)

  const { positions, velocities, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count)
    const colors = new Float32Array(count * 3)

    const yellowColor = new THREE.Color(YELLOW)
    const limeColor = new THREE.Color(LIME)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3

      // Start from center with random direction bias
      const theta = Math.random() * Math.PI * 2
      const phi = (Math.random() - 0.5) * Math.PI * 0.5
      const radius = 0.3 + Math.random() * 0.5

      positions[i3] = Math.cos(theta) * Math.cos(phi) * radius
      positions[i3 + 1] = Math.sin(phi) * radius
      positions[i3 + 2] = Math.sin(theta) * Math.cos(phi) * radius

      // Velocity outward with some randomization
      velocities[i] = 0.02 + Math.random() * 0.04

      // Color mix
      const color = Math.random() < 0.6 ? yellowColor : limeColor
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b
    }

    return { positions, velocities, colors }
  }, [count])

  useFrame(() => {
    if (!pointsRef.current) return

    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
    const array = posAttr.array as Float32Array

    for (let i = 0; i < count; i++) {
      const i3 = i * 3

      // Move outward
      const dist = Math.sqrt(
        array[i3] ** 2 + array[i3 + 1] ** 2 + array[i3 + 2] ** 2
      )

      if (dist > 0.01) {
        const dir = 1 / dist
        array[i3] += array[i3] * dir * velocities[i]
        array[i3 + 1] += array[i3 + 1] * dir * velocities[i]
        array[i3 + 2] += array[i3 + 2] * dir * velocities[i]
      }

      // Reset if too far
      if (dist > 8) {
        const theta = Math.random() * Math.PI * 2
        const phi = (Math.random() - 0.5) * Math.PI * 0.5
        const radius = 0.3 + Math.random() * 0.5
        array[i3] = Math.cos(theta) * Math.cos(phi) * radius
        array[i3 + 1] = Math.sin(phi) * radius
        array[i3 + 2] = Math.sin(theta) * Math.cos(phi) * radius
      }
    }

    posAttr.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
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
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

// ============================================================================
// ELECTROMAGNETIC FIELD RINGS
// ============================================================================

function FieldRings() {
  const groupRef = useRef<THREE.Group>(null!)

  const rings = useMemo(() => {
    return [
      { radius: 1.5, tilt: 0, speed: 0.8, phase: 0, color: YELLOW },
      { radius: 2.2, tilt: Math.PI / 3, speed: 0.6, phase: Math.PI / 4, color: LIME },
      { radius: 2.8, tilt: Math.PI / 6, speed: 1.0, phase: Math.PI / 2, color: YELLOW },
      { radius: 3.5, tilt: Math.PI / 2, speed: 0.5, phase: Math.PI, color: LIME },
    ]
  }, [])

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1
    }
  })

  return (
    <group ref={groupRef}>
      {rings.map((ring, i) => (
        <mesh
          key={i}
          rotation={[ring.tilt, 0, 0]}
        >
          <torusGeometry args={[ring.radius, 0.02, 8, 64]} />
          <meshBasicMaterial
            color={ring.color}
            transparent
            opacity={0.4}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

// ============================================================================
// ENERGY SPARKS
// ============================================================================

function EnergySparks({ count = 100 }: { count?: number }) {
  const sparksRef = useRef<THREE.Points>(null!)
  const sparksDataRef = useRef<{ angle: number; radius: number; height: number; speed: number }[]>([])

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const data: { angle: number; radius: number; height: number; speed: number }[] = []

    for (let i = 0; i < count; i++) {
      const i3 = i * 3

      // Distribute in a cone pattern
      const angle = Math.random() * Math.PI * 2
      const radius = 0.5 + Math.random() * 2
      const height = 0.5 + Math.random() * 3

      pos[i3] = Math.cos(angle) * radius
      pos[i3 + 1] = height
      pos[i3 + 2] = Math.sin(angle) * radius

      data.push({ angle, radius, height, speed: 0.5 + Math.random() })
    }

    sparksDataRef.current = data
    return pos
  }, [count])

  useFrame((state) => {
    if (!sparksRef.current) return

    const t = state.clock.elapsedTime
    const posAttr = sparksRef.current.geometry.attributes.position as THREE.BufferAttribute
    const array = posAttr.array as Float32Array

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const data = sparksDataRef.current[i]

      // Spiral upward motion
      const newAngle = data.angle + t * data.speed * 0.5
      const wobble = Math.sin(t * data.speed * 2) * 0.1

      array[i3] = Math.cos(newAngle) * (data.radius + wobble)
      array[i3 + 1] = data.height + Math.sin(t * data.speed) * 0.2
      array[i3 + 2] = Math.sin(newAngle) * (data.radius + wobble)
    }

    posAttr.needsUpdate = true
  })

  return (
    <points ref={sparksRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={YELLOW}
        size={0.06}
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

// ============================================================================
// PULSAR BEACON (Rotating light cone)
// ============================================================================

function BeaconCone() {
  const coneRef = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    if (coneRef.current) {
      coneRef.current.rotation.y = state.clock.elapsedTime * 0.5
      coneRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.3) * 0.05

      const material = coneRef.current.material as THREE.MeshBasicMaterial
      material.opacity = 0.15 + Math.sin(state.clock.elapsedTime * 2) * 0.1
    }
  })

  return (
    <mesh ref={coneRef}>
      <coneGeometry args={[4, 8, 32, 1, true]} />
      <meshBasicMaterial
        color={LIME}
        transparent
        opacity={0.2}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  )
}

// ============================================================================
// MAIN PULSAR SCENE
// ============================================================================

export default function PulsarScene() {
  const isMobile = useIsMobile()
  const groupRef = useRef<THREE.Group>(null!)

  useFrame((state) => {
    if (groupRef.current) {
      // Subtle drift
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.05
    }
  })

  return (
    <group ref={groupRef}>
      <color attach="background" args={['#000000']} />

      {/* Main pulsar core */}
      <PulsarCore />

      {/* Four rotating beams */}
      <RotatingBeam rotation={0} speed={1.2} />
      <RotatingBeam rotation={Math.PI / 2} speed={1.0} />
      <RotatingBeam rotation={Math.PI} speed={1.4} />
      <RotatingBeam rotation={Math.PI * 1.5} speed={0.9} />

      {/* Field rings */}
      <FieldRings />

      {/* Expanding ripples */}
      <Ripple delay={0} speed={0.4} maxRadius={6} />
      <Ripple delay={0.25} speed={0.4} maxRadius={6} />
      <Ripple delay={0.5} speed={0.4} maxRadius={6} />
      <Ripple delay={0.75} speed={0.4} maxRadius={6} />

      {/* Particle trails */}
      <ParticleTrails count={isMobile ? 140 : 400} />

      {/* Energy sparks */}
      <EnergySparks count={isMobile ? 28 : 80} />

      {/* Beacon cone */}
      <BeaconCone />
    </group>
  )
}