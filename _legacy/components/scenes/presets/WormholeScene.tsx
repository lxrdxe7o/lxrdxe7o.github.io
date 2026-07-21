import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useIsMobile } from '@/hooks/useIsMobile'

const GOLD = '#fbbf24'
const YELLOW = '#eab308'

// Tunnel rings for wormhole structure
function TunnelRings() {
  const groupRef = useRef<THREE.Group>(null!)
  
  const rings = useMemo(() => {
    const ringData = []
    const numRings = 24
    for (let i = 0; i < numRings; i++) {
      const z = -5 - i * 1.2
      const radius = 3 + Math.sin(i * 0.3) * 0.5
      const rotation = i * 0.15
      ringData.push({ z, radius, rotation, index: i })
    }
    return ringData
  }, [])

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = state.clock.elapsedTime * 0.15
    }
  })

  return (
    <group ref={groupRef}>
      {rings.map((ring, i) => {
        const pulseIntensity = Math.sin(i * 0.4 + Date.now() * 0.002) * 0.2 + 0.8
        return (
          <mesh key={i} position={[0, 0, ring.z]} rotation={[Math.PI / 2, 0, ring.rotation]}>
            <torusGeometry args={[ring.radius, 0.08, 16, 64]} />
            <meshBasicMaterial
              color={i % 3 === 0 ? GOLD : YELLOW}
              transparent
              opacity={pulseIntensity * 0.6}
            />
          </mesh>
        )
      })}
    </group>
  )
}

// Timeline particles flowing through wormhole
function TimelineParticles({ count = 3000 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null!)
  
  const { positions, velocities, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    
    const goldColor = new THREE.Color(GOLD)
    const yellowColor = new THREE.Color(YELLOW)
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      
      // Start near the wormhole opening
      const angle = Math.random() * Math.PI * 2
      const radius = 1 + Math.random() * 4
      positions[i3] = Math.cos(angle) * radius
      positions[i3 + 1] = Math.sin(angle) * radius
      positions[i3 + 2] = -5 - Math.random() * 25
      
      // Velocity pulling toward center and forward
      const toCenter = -radius * 0.02
      velocities[i3] = Math.cos(angle) * toCenter
      velocities[i3 + 1] = Math.sin(angle) * toCenter
      velocities[i3 + 2] = 0.15 + Math.random() * 0.1
      
      // Color variation
      const colorMix = Math.random()
      const color = colorMix < 0.6 ? goldColor : yellowColor
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b
    }
    
    return { positions, velocities, colors }
  }, [count])

  useFrame(() => {
    if (pointsRef.current) {
      const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
      const array = posAttr.array as Float32Array
      
      for (let i = 0; i < count; i++) {
        const i3 = i * 3
        
        // Move particles
        array[i3] += velocities[i3]
        array[i3 + 1] += velocities[i3 + 1]
        array[i3 + 2] += velocities[i3 + 2]
        
        // Reset particles that pass through
        if (array[i3 + 2] > 3) {
          const angle = Math.random() * Math.PI * 2
          const radius = 1 + Math.random() * 4
          array[i3] = Math.cos(angle) * radius
          array[i3 + 1] = Math.sin(angle) * radius
          array[i3 + 2] = -30 - Math.random() * 5
          
          // Vary velocity based on radius
          const toCenter = -radius * 0.02
          velocities[i3] = Math.cos(angle) * toCenter
          velocities[i3 + 1] = Math.sin(angle) * toCenter
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
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
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

// Swirling energy vortex
function EnergyVortex() {
  const meshRef = useRef<THREE.Mesh>(null!)
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor1: { value: new THREE.Color(GOLD) },
    uColor2: { value: new THREE.Color(YELLOW) }
  }), [])

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime
    if (meshRef.current) {
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.3
    }
  })

  const vortexShader = {
    vertexShader: `
      varying vec2 vUv;
      varying float vDist;
      
      void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vDist = length(position.xy);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      
      varying vec2 vUv;
      varying float vDist;
      
      void main() {
        vec2 center = vUv - 0.5;
        float angle = atan(center.y, center.x);
        float dist = length(center);
        
        // Swirling pattern
        float swirl = sin(angle * 8.0 + uTime * 2.0 - dist * 10.0) * 0.5 + 0.5;
        swirl *= sin(angle * 4.0 - uTime * 1.5) * 0.5 + 0.5;
        
        // Radial fade
        float fade = 1.0 - smoothstep(0.0, 0.5, dist);
        
        // Mix colors based on swirl
        vec3 color = mix(uColor1, uColor2, swirl);
        
        float alpha = swirl * fade * 0.4;
        
        if (alpha < 0.01) discard;
        
        gl_FragColor = vec4(color, alpha);
      }
    `
  }

  return (
    <mesh ref={meshRef} position={[0, 0, -2]}>
      <planeGeometry args={[8, 8, 32, 32]} />
      <shaderMaterial
        vertexShader={vortexShader.vertexShader}
        fragmentShader={vortexShader.fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// Star streaks for time dilation effect
function StarStreaks({ count = 800 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null!)
  
  const { positions, velocities, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count)
    const colors = new Float32Array(count * 3)
    
    const goldColor = new THREE.Color(GOLD)
    const yellowColor = new THREE.Color(YELLOW)
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      
      // Distribute along tunnel
      const angle = Math.random() * Math.PI * 2
      const radius = 2 + Math.random() * 6
      positions[i3] = Math.cos(angle) * radius
      positions[i3 + 1] = Math.sin(angle) * radius
      positions[i3 + 2] = -10 - Math.random() * 20
      
      velocities[i] = 0.3 + Math.random() * 0.5
      
      const color = Math.random() < 0.6 ? goldColor : yellowColor
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b
    }
    
    return { positions, velocities, colors }
  }, [count])

  useFrame(() => {
    if (pointsRef.current) {
      const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
      const array = posAttr.array as Float32Array
      
      for (let i = 0; i < count; i++) {
        const i3 = i * 3
        array[i3 + 2] += velocities[i]
        
        if (array[i3 + 2] > 3) {
          const angle = Math.random() * Math.PI * 2
          const radius = 2 + Math.random() * 6
          array[i3] = Math.cos(angle) * radius
          array[i3 + 1] = Math.sin(angle) * radius
          array[i3 + 2] = -30
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
        opacity={0.7}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

// Event horizon glow
function EventHorizon() {
  const meshRef = useRef<THREE.Mesh>(null!)
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(GOLD) }
  }), [])

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 0.8) * 0.05)
    }
  })

  const horizonShader = {
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      
      varying vec2 vUv;
      
      void main() {
        vec2 center = vUv - 0.5;
        float dist = length(center);
        
        // Gravitational lensing effect - light bending
        float lensing = 1.0 - smoothstep(0.2, 0.5, dist);
        float glow = 1.0 - smoothstep(0.0, 0.5, dist);
        glow = pow(glow, 2.0);
        
        // Pulsing
        float pulse = sin(uTime * 1.5) * 0.2 + 0.8;
        
        vec3 color = uColor * pulse;
        float alpha = glow * lensing * 0.6;
        
        if (alpha < 0.01) discard;
        
        gl_FragColor = vec4(color, alpha);
      }
    `
  }

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <planeGeometry args={[10, 10]} />
      <shaderMaterial
        vertexShader={horizonShader.vertexShader}
        fragmentShader={horizonShader.fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// Main wormhole scene component
export default function WormholeScene() {
  const isMobile = useIsMobile()
  const groupRef = useRef<THREE.Group>(null!)

  useFrame((state) => {
    if (groupRef.current) {
      // Subtle camera shake
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.02
      groupRef.current.rotation.y = Math.cos(state.clock.elapsedTime * 0.2) * 0.02
    }
  })

  return (
    <group ref={groupRef}>
      <color attach="background" args={['#000000']} />

      {/* Core vortex */}
      <EnergyVortex />

      {/* Tunnel structure */}
      <TunnelRings />

      {/* Particles flowing through */}
      <TimelineParticles count={isMobile ? 800 : 2500} />

      {/* Star streaks for time dilation */}
      <StarStreaks count={isMobile ? 200 : 600} />

      {/* Event horizon */}
      <EventHorizon />
    </group>
  )
}