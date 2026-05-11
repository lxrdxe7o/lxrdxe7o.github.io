import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { useIsMobile } from '@/hooks/useIsMobile'

const DARK_RED = '#dc2626'
const ROSE = '#e11d48'
const VOID_BLACK = '#000000'
const VOID_DEEP = '#050000'

// Code fragment data
const codeFragments = [
  'const void = darkness',
  'import { hope } from cosmos',
  'function despair() { return null }',
  'null === undefined',
  'while(true) { break }',
  '// TODO: find meaning',
  'console.log(entropy)',
  'export default void',
  'async function dream() {}',
  'type Nothing = void',
  'interface Existence { void: null }',
  'git commit -m "reset --hard"',
  'docker rm -f life',
  'rm -rf /hope',
  'npm install darkness',
  'sudo rm -rf /',
]

// Floating code fragment component
function CodeFragment({ 
  position, 
  text, 
  scale = 1 
}: { 
  position: [number, number, number]
  text: string
  scale?: number 
}) {
  const meshRef = useRef<THREE.Group>(null!)
  const floatOffset = useMemo(() => Math.random() * Math.PI * 2, [])

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating motion
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5 + floatOffset) * 0.3
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.3 + floatOffset) * 0.1
    }
  })

  return (
    <group ref={meshRef} position={position} scale={scale}>
      <Text
        fontSize={0.15}
        color={Math.random() > 0.5 ? DARK_RED : ROSE}
        anchorX="center"
        anchorY="middle"
        maxWidth={3}
        fillOpacity={0.6 + Math.random() * 0.3}
        font="https://fonts.gstatic.com/s/spacemono/v12/i7dPIFZifjKcF5UAWdDRYEF8RQ.woff"
      >
        {text}
      </Text>
    </group>
  )
}

// Void particles for depth
function VoidParticles({ count = 2000 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null!)
  
  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    const darkRed = new THREE.Color(DARK_RED)
    const rose = new THREE.Color(ROSE)
    const deepRed = new THREE.Color('#8b0000')
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      
      // Distribute in a sphere
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = 5 + Math.random() * 15
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i3 + 2] = radius * Math.cos(phi)
      
      // Color variation
      const colorChoice = Math.random()
      let color
      if (colorChoice < 0.4) {
        color = darkRed
      } else if (colorChoice < 0.7) {
        color = rose
      } else {
        color = deepRed
      }
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b
      
    }

    return { positions, colors }
  }, [count])

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.01) * 0.05
    }
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
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

// Burst energy particles
function BurstParticles({ count = 500 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null!)
  const burstTime = useRef(0)
  const isBursting = useRef(false)
  
  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      positions[i3] = 0
      positions[i3 + 1] = 0
      positions[i3 + 2] = 0
      velocities[i3] = 0
      velocities[i3 + 1] = 0
      velocities[i3 + 2] = 0
    }
    
    return { positions, velocities }
  }, [count])

  useFrame(() => {
    if (pointsRef.current) {
      const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
      const array = posAttr.array as Float32Array

      // Trigger burst randomly
      if (!isBursting.current && Math.random() < 0.002) {
        isBursting.current = true
        burstTime.current = 0
        
        // Initialize burst from center
        for (let i = 0; i < count; i++) {
          const i3 = i * 3
          array[i3] = 0
          array[i3 + 1] = 0
          array[i3 + 2] = 0
          
          const theta = Math.random() * Math.PI * 2
          const phi = Math.acos(2 * Math.random() - 1)
          const speed = 0.05 + Math.random() * 0.1
          
          velocities[i3] = Math.sin(phi) * Math.cos(theta) * speed
          velocities[i3 + 1] = Math.sin(phi) * Math.sin(theta) * speed
          velocities[i3 + 2] = Math.cos(phi) * speed
        }
      }
      
      if (isBursting.current) {
        burstTime.current += 0.016
        
        // Update positions
        for (let i = 0; i < count; i++) {
          const i3 = i * 3
          array[i3] += velocities[i3]
          array[i3 + 1] += velocities[i3 + 1]
          array[i3 + 2] += velocities[i3 + 2]
          
          // Slow down
          velocities[i3] *= 0.98
          velocities[i3 + 1] *= 0.98
          velocities[i3 + 2] *= 0.98
        }
        
        if (burstTime.current > 2) {
          isBursting.current = false
        }
        
        posAttr.needsUpdate = true
      }
    }
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
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color={ROSE}
        transparent
        opacity={0.9}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

// Supernova burst effect
function SupernovaBurst() {
  const groupRef = useRef<THREE.Mesh>(null!)
  const intensityRef = useRef(0)
  const targetIntensity = useRef(0)

  useFrame(() => {
    // Randomly trigger bursts
    if (Math.random() < 0.003 && intensityRef.current === 0) {
      targetIntensity.current = 1
    }

    // Smooth intensity transition
    intensityRef.current += (targetIntensity.current - intensityRef.current) * 0.1

    // Decay after burst
    if (intensityRef.current > 0.9) {
      targetIntensity.current = 0
    }

    if (groupRef.current) {
      const scale = 1 + intensityRef.current * 0.5
      groupRef.current.scale.setScalar(scale);
      (groupRef.current.material as THREE.MeshBasicMaterial).opacity = intensityRef.current * 0.3
    }
  })

  return (
    <mesh ref={groupRef} position={[0, 0, -5]}>
      <sphereGeometry args={[2, 32, 32]} />
      <meshBasicMaterial
        color={ROSE}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  )
}

// Flickering ember particles
function EmberParticles({ count = 300 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null!)
  
  const { positions, velocities, lifetimes } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    const lifetimes = new Float32Array(count)
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      positions[i3] = (Math.random() - 0.5) * 20
      positions[i3 + 1] = (Math.random() - 0.5) * 20
      positions[i3 + 2] = (Math.random() - 0.5) * 20
      
      velocities[i3] = (Math.random() - 0.5) * 0.02
      velocities[i3 + 1] = 0.01 + Math.random() * 0.02
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02
      
      lifetimes[i] = Math.random()
    }
    
    return { positions, velocities, lifetimes }
  }, [count])

  useFrame(() => {
    if (pointsRef.current) {
      const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
      const array = posAttr.array as Float32Array

      for (let i = 0; i < count; i++) {
        const i3 = i * 3
        array[i3] += velocities[i3]
        array[i3 + 1] += velocities[i3 + 1]
        array[i3 + 2] += velocities[i3 + 2]
        
        lifetimes[i] -= 0.005
        
        // Reset particles
        if (lifetimes[i] <= 0 || array[i3 + 1] > 10) {
          array[i3] = (Math.random() - 0.5) * 20
          array[i3 + 1] = -10 + Math.random() * 5
          array[i3 + 2] = (Math.random() - 0.5) * 20
          lifetimes[i] = 1
        }
      }
      
      posAttr.needsUpdate = true
    }
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
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color={DARK_RED}
        transparent
        opacity={0.7}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

// Main scene component
export default function CrimsonVoidScene() {
  const isMobile = useIsMobile()
  const groupRef = useRef<THREE.Group>(null!)
  
  // Generate code fragment positions
  const fragmentData = useMemo(() => {
    return codeFragments.map((text, i) => {
      const theta = (i / codeFragments.length) * Math.PI * 2
      const radius = 4 + Math.random() * 6
      const x = Math.cos(theta) * radius + (Math.random() - 0.5) * 3
      const y = (Math.random() - 0.5) * 8
      const z = -5 + Math.random() * 10 + (Math.random() - 0.5) * 5
      const scale = 0.8 + Math.random() * 0.5
      return { text, position: [x, y, z] as [number, number, number], scale }
    })
  }, [])

  useFrame((state) => {
    if (groupRef.current) {
      // Subtle breathing motion
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.1
      groupRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.08) * 0.05
    }
  })

  return (
    <group ref={groupRef}>
      {/* Deep void background */}
      <color attach="background" args={[VOID_BLACK]} />
      <fog attach="fog" args={[VOID_DEEP, 5, 30]} />
      
      {/* Void depth particles */}
      <VoidParticles count={isMobile ? 700 : 2500} />

      {/* Floating code fragments */}
      {fragmentData.map((frag, i) => (
        <CodeFragment
          key={i}
          position={frag.position}
          text={frag.text}
          scale={frag.scale}
        />
      ))}

      {/* Ember rising particles */}
      <EmberParticles count={isMobile ? 140 : 400} />

      {/* Burst events */}
      <BurstParticles count={isMobile ? 210 : 600} />
      
      {/* Sparkle effects from drei */}
      <Sparkles
        count={100}
        scale={15}
        size={3}
        speed={0.3}
        color={ROSE}
        opacity={0.5}
      />
      
      {/* Distant supernova burst */}
      <SupernovaBurst />
    </group>
  )
}