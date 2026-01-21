import { useRef, useMemo, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ============================================
// STAR FIELD - 3D particles with twinkling
// ============================================
function StarField({ count = 3000 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null!)
  const timeRef = useRef(0)

  const { positions, colors, sizes, twinklePhases, twinkleSpeeds } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const twinklePhases = new Float32Array(count)
    const twinkleSpeeds = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      // Distribute stars in a large sphere around the camera
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = 50 + Math.random() * 150 // Depth variation

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi) - 80 // Push back

      // Star colors - mostly white/blue with some warm stars
      const colorChoice = Math.random()
      if (colorChoice < 0.6) {
        // White/blue stars
        colors[i * 3] = 0.9 + Math.random() * 0.1
        colors[i * 3 + 1] = 0.9 + Math.random() * 0.1
        colors[i * 3 + 2] = 1.0
      } else if (colorChoice < 0.8) {
        // Yellow stars
        colors[i * 3] = 1.0
        colors[i * 3 + 1] = 0.9 + Math.random() * 0.1
        colors[i * 3 + 2] = 0.7 + Math.random() * 0.2
      } else if (colorChoice < 0.95) {
        // Red/orange stars
        colors[i * 3] = 1.0
        colors[i * 3 + 1] = 0.6 + Math.random() * 0.3
        colors[i * 3 + 2] = 0.4 + Math.random() * 0.2
      } else {
        // Blue giants
        colors[i * 3] = 0.6 + Math.random() * 0.2
        colors[i * 3 + 1] = 0.7 + Math.random() * 0.2
        colors[i * 3 + 2] = 1.0
      }

      // Vary star sizes - mostly small with some bright ones
      const sizeRandom = Math.random()
      if (sizeRandom < 0.9) {
        sizes[i] = 0.3 + Math.random() * 0.7
      } else if (sizeRandom < 0.98) {
        sizes[i] = 1.0 + Math.random() * 1.5
      } else {
        sizes[i] = 2.5 + Math.random() * 1.5 // Bright stars
      }

      twinklePhases[i] = Math.random() * Math.PI * 2
      twinkleSpeeds[i] = 0.5 + Math.random() * 2.0
    }

    return { positions, colors, sizes, twinklePhases, twinkleSpeeds }
  }, [count])

  const starMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float aSize;
        attribute float aTwinklePhase;
        attribute float aTwinkleSpeed;

        uniform float uTime;
        uniform float uPixelRatio;

        varying vec3 vColor;
        varying float vTwinkle;

        void main() {
          vColor = color;

          // Twinkle effect
          float twinkle = sin(uTime * aTwinkleSpeed + aTwinklePhase) * 0.5 + 0.5;
          twinkle = 0.4 + twinkle * 0.6; // Range from 0.4 to 1.0
          vTwinkle = twinkle;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

          // Size attenuation
          float sizeAttenuation = (300.0 / -mvPosition.z);
          gl_PointSize = aSize * sizeAttenuation * uPixelRatio * twinkle;

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vTwinkle;

        void main() {
          // Circular star with soft glow
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);

          // Core
          float core = 1.0 - smoothstep(0.0, 0.15, dist);

          // Glow
          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          glow = pow(glow, 2.0);

          // Combine
          float alpha = core + glow * 0.5;
          alpha *= vTwinkle;

          if (alpha < 0.01) discard;

          vec3 finalColor = vColor * (core + glow * 0.3);
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    })
  }, [])

  useFrame((state) => {
    timeRef.current = state.clock.elapsedTime
    starMaterial.uniforms.uTime.value = timeRef.current
  })

  return (
    <points ref={pointsRef} material={starMaterial}>
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
          attach="attributes-aSize"
          count={count}
          array={sizes}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aTwinklePhase"
          count={count}
          array={twinklePhases}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aTwinkleSpeed"
          count={count}
          array={twinkleSpeeds}
          itemSize={1}
        />
      </bufferGeometry>
    </points>
  )
}

// ============================================
// VOLUMETRIC NEBULA CLOUDS
// ============================================
function NebulaCloud({
  position,
  scale = 1,
  color1,
  color2,
  opacity = 0.3,
  speed = 1
}: {
  position: [number, number, number]
  scale?: number
  color1: string
  color2: string
  opacity?: number
  speed?: number
}) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const timeOffset = useRef(Math.random() * 100)

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor1: { value: new THREE.Color(color1) },
    uColor2: { value: new THREE.Color(color2) },
    uOpacity: { value: opacity },
    uSpeed: { value: speed }
  }), [color1, color2, opacity, speed])

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime + timeOffset.current
  })

  const nebulaShader = {
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;
      void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform float uOpacity;
      uniform float uSpeed;

      varying vec2 vUv;
      varying vec3 vPosition;

      // Simplex noise
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                           -0.577350269189626, 0.024390243902439);
        vec2 i = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m;
        m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x = a0.x * x0.x + h.x * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      float fbm(vec2 p, int octaves) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        for(int i = 0; i < 8; i++) {
          if(i >= octaves) break;
          value += amplitude * snoise(p * frequency);
          amplitude *= 0.5;
          frequency *= 2.0;
        }
        return value;
      }

      void main() {
        vec2 uv = vUv;
        float time = uTime * 0.02 * uSpeed;

        // Create swirling nebula pattern
        vec2 p = uv * 2.0 - 1.0;
        float dist = length(p);

        // Multiple noise layers
        float n1 = fbm(uv * 3.0 + time * vec2(0.3, 0.2), 6);
        float n2 = fbm(uv * 5.0 - time * vec2(0.2, 0.3), 5);
        float n3 = fbm(uv * 2.0 + time * vec2(0.1, -0.1), 4);

        // Combine noises
        float nebula = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
        nebula = nebula * 0.5 + 0.5;

        // Edge fade
        float edgeFade = 1.0 - smoothstep(0.3, 0.8, dist);
        nebula *= edgeFade;

        // Color mixing
        vec3 color = mix(uColor1, uColor2, nebula);

        // Add bright spots
        float spots = pow(max(0.0, snoise(uv * 8.0 + time)), 3.0);
        color += vec3(1.0, 0.9, 0.8) * spots * 0.3;

        float alpha = nebula * uOpacity * edgeFade;

        if (alpha < 0.01) discard;

        gl_FragColor = vec4(color, alpha);
      }
    `
  }

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <planeGeometry args={[40, 40]} />
      <shaderMaterial
        vertexShader={nebulaShader.vertexShader}
        fragmentShader={nebulaShader.fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function NebulaLayers() {
  const nebulae = useMemo(() => [
    // Main large nebula clouds
    { position: [0, 0, -100] as [number, number, number], scale: 4, color1: '#4c1d95', color2: '#7c3aed', opacity: 0.25, speed: 0.8 },
    { position: [-30, 20, -90] as [number, number, number], scale: 3, color1: '#831843', color2: '#ec4899', opacity: 0.2, speed: 1.2 },
    { position: [25, -15, -110] as [number, number, number], scale: 3.5, color1: '#1e1b4b', color2: '#6366f1', opacity: 0.22, speed: 0.9 },
    // Distant nebulae
    { position: [-50, -30, -140] as [number, number, number], scale: 5, color1: '#581c87', color2: '#a855f7', opacity: 0.15, speed: 0.6 },
    { position: [40, 35, -130] as [number, number, number], scale: 4, color1: '#701a75', color2: '#d946ef', opacity: 0.18, speed: 0.7 },
    // Foreground hints
    { position: [15, 10, -60] as [number, number, number], scale: 2, color1: '#3b0764', color2: '#9333ea', opacity: 0.12, speed: 1.5 },
  ], [])

  return (
    <group>
      {nebulae.map((nebula, i) => (
        <NebulaCloud key={i} {...nebula} />
      ))}
    </group>
  )
}

// ============================================
// COSMIC DUST PARTICLES
// ============================================
function CosmicDust({ count = 500 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null!)

  const { positions, sizes, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const velocities = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      // Distribute in a box around the scene
      positions[i * 3] = (Math.random() - 0.5) * 100
      positions[i * 3 + 1] = (Math.random() - 0.5) * 60
      positions[i * 3 + 2] = -30 - Math.random() * 80

      sizes[i] = 0.1 + Math.random() * 0.3

      // Slow drift velocities
      velocities[i * 3] = (Math.random() - 0.5) * 0.02
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01
    }

    return { positions, sizes, velocities }
  }, [count])

  useFrame(() => {
    if (pointsRef.current) {
      const positionAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
      const posArray = positionAttr.array as Float32Array

      for (let i = 0; i < count; i++) {
        posArray[i * 3] += velocities[i * 3]
        posArray[i * 3 + 1] += velocities[i * 3 + 1]
        posArray[i * 3 + 2] += velocities[i * 3 + 2]

        // Wrap around
        if (posArray[i * 3] > 50) posArray[i * 3] = -50
        if (posArray[i * 3] < -50) posArray[i * 3] = 50
        if (posArray[i * 3 + 1] > 30) posArray[i * 3 + 1] = -30
        if (posArray[i * 3 + 1] < -30) posArray[i * 3 + 1] = 30
      }

      positionAttr.needsUpdate = true
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
          attach="attributes-size"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color="#c084fc"
        transparent
        opacity={0.4}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

// ============================================
// DEEP SPACE BACKDROP - The base layer
// ============================================
function DeepSpaceBackdrop() {
  const meshRef = useRef<THREE.Mesh>(null!)

  const uniforms = useMemo(() => ({
    uTime: { value: 0 }
  }), [])

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime
  })

  const backdropShader = {
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      void main() {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      }
    `
  }

  return (
    <mesh ref={meshRef} position={[0, 0, -250]}>
      <planeGeometry args={[500, 300]} />
      <shaderMaterial
        vertexShader={backdropShader.vertexShader}
        fragmentShader={backdropShader.fragmentShader}
        uniforms={uniforms}
        depthWrite={false}
      />
    </mesh>
  )
}

// ============================================
// SHOOTING STARS with trail effect
// ============================================
function ShootingStar({
  startPosition,
  direction,
  speed,
  onComplete
}: {
  startPosition: THREE.Vector3
  direction: THREE.Vector3
  speed: number
  onComplete: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const lifeRef = useRef(1.0)
  const positionRef = useRef(startPosition.clone())

  const uniforms = useMemo(() => ({
    uLife: { value: 1.0 },
    uColor: { value: new THREE.Color(Math.random() > 0.5 ? '#ffffff' : '#c4b5fd') }
  }), [])

  const trailShader = useMemo(() => ({
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uLife;
      uniform vec3 uColor;
      varying vec2 vUv;

      void main() {
        // Trail gradient - bright at head, fading to tail
        float trailGradient = pow(vUv.y, 0.5);

        // Horizontal fade for rounded edges
        float horizontalFade = 1.0 - abs(vUv.x - 0.5) * 2.0;
        horizontalFade = pow(horizontalFade, 0.3);

        // Core brightness at the head
        float core = smoothstep(0.7, 1.0, vUv.y) * horizontalFade;

        // Overall alpha
        float alpha = trailGradient * horizontalFade * uLife;

        // Color - white core, tinted trail
        vec3 coreColor = vec3(1.0);
        vec3 trailColor = uColor;
        vec3 finalColor = mix(trailColor, coreColor, core);

        // Add glow to the head
        float glow = smoothstep(0.85, 1.0, vUv.y) * 2.0;
        finalColor += vec3(1.0) * glow * uLife;

        gl_FragColor = vec4(finalColor, alpha * 0.9);
      }
    `
  }), [])

  useFrame((_, delta) => {
    if (!meshRef.current) return

    // Move the shooting star
    const velocity = direction.clone().multiplyScalar(speed * delta * 60)
    positionRef.current.add(velocity)
    meshRef.current.position.copy(positionRef.current)

    // Fade out
    lifeRef.current -= delta * 0.8
    uniforms.uLife.value = Math.max(0, lifeRef.current)

    if (lifeRef.current <= 0) {
      onComplete()
    }
  })

  // Calculate rotation to align with direction
  const rotation = useMemo(() => {
    const angle = Math.atan2(direction.x, -direction.y)
    return [0, 0, angle] as [number, number, number]
  }, [direction])

  return (
    <mesh ref={meshRef} position={startPosition} rotation={rotation}>
      <planeGeometry args={[0.3, 8]} />
      <shaderMaterial
        vertexShader={trailShader.vertexShader}
        fragmentShader={trailShader.fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function ShootingStars({ maxStars = 3, spawnInterval = 2 }: { maxStars?: number, spawnInterval?: number }) {
  const [stars, setStars] = useState<Array<{
    id: number
    position: THREE.Vector3
    direction: THREE.Vector3
    speed: number
  }>>([])
  const idCounter = useRef(0)
  const lastSpawnRef = useRef(0)

  useFrame((state) => {
    const time = state.clock.elapsedTime

    // Spawn new shooting star
    if (stars.length < maxStars && time - lastSpawnRef.current > spawnInterval + Math.random() * 3) {
      lastSpawnRef.current = time

      // Random starting position in the upper part of the scene
      const startX = (Math.random() - 0.3) * 100
      const startY = 25 + Math.random() * 15
      const startZ = -40 - Math.random() * 40

      // Direction - mostly diagonal downward
      const dirX = -0.3 - Math.random() * 0.7 // Leftward bias
      const dirY = -0.8 - Math.random() * 0.4 // Downward
      const direction = new THREE.Vector3(dirX, dirY, 0).normalize()

      setStars(prev => [...prev, {
        id: idCounter.current++,
        position: new THREE.Vector3(startX, startY, startZ),
        direction,
        speed: 1.5 + Math.random() * 1.5
      }])
    }
  })

  const removestar = useCallback((id: number) => {
    setStars(prev => prev.filter(s => s.id !== id))
  }, [])

  return (
    <group>
      {stars.map(star => (
        <ShootingStar
          key={star.id}
          startPosition={star.position}
          direction={star.direction}
          speed={star.speed}
          onComplete={() => removestar(star.id)}
        />
      ))}
    </group>
  )
}

// ============================================
// MAIN EXPORT
// ============================================
interface AbyssBackgroundProps {
  isMobile?: boolean
  isLowEnd?: boolean
}

export default function AbyssBackground({ isMobile = false, isLowEnd = false }: AbyssBackgroundProps) {
  // Reduce particle counts significantly on mobile devices for better performance
  const starCount = isLowEnd ? 800 : isMobile ? 1500 : 4000
  const dustCount = isLowEnd ? 0 : isMobile ? 150 : 600

  return (
    <group>
      {/* Base layer - deep space */}
      <DeepSpaceBackdrop />

      {/* Layer 1 - Volumetric nebulae - skip on low-end devices */}
      {!isLowEnd && <NebulaLayers />}

      {/* Layer 2 - Star field - reduced count on mobile */}
      <StarField count={starCount} />

      {/* Layer 3 - Cosmic dust - reduced count on mobile, disabled on low-end */}
      {dustCount > 0 && <CosmicDust count={dustCount} />}

      {/* Layer 4 - Shooting stars - disabled on mobile for performance */}
      {!isMobile && <ShootingStars />}
    </group>
  )
}
