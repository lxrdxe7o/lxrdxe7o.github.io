import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

// ============================================================================
// PLANET TYPE DEFINITIONS
// ============================================================================

type PlanetType = 'rocky' | 'terrestrial' | 'gas_giant' | 'ice_giant' | 'hot_jupiter' | 'super_earth'

interface PlanetData {
  name: string
  color: string
  size: number
  orbitRadius: number
  speed: number
  emissive: string
  type: PlanetType
  hasAtmosphere?: boolean
  atmosphereColor?: string
  atmosphereOpacity?: number
  hasClouds?: boolean
  cloudColor?: string
  cloudSpeed?: number
  hasRings?: boolean
  ringColors?: string[]
  ringGaps?: number[]
  hasBands?: boolean
  bandColors?: string[]
  hasIceCaps?: boolean
  iceCapsColor?: string
  hasStorm?: boolean
  stormColor?: string
  stormPosition?: [number, number]
  hasMoon?: boolean
  tilt?: number
  rotationSpeed?: number
  surfaceRoughness?: number
  surfaceDetail?: string
  textureUrl?: string
  bumpMapUrl?: string
  normalMapUrl?: string
  specularMapUrl?: string
  cloudsMapUrl?: string
  ringMapUrl?: string
}

// ============================================================================
// SYSTEM DATA
// ============================================================================

const TEXTURE_PATH = '/textures/'
const DEFAULT_TEXTURE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

const OUR_SOLAR_SYSTEM = {
  name: 'Solar System',
  star: {
    name: 'Sun',
    color: '#FFB84D', // More pinkish-gold
    emissive: '#FF5C8D', // Deep pink/gold emissive
    size: 3.2,
    coronaColor: '#FF1493', // Deep pink corona
    surfaceActivity: true,
    textureUrl: TEXTURE_PATH + '2k_sun.jpg'
  },
  planets: [
    {
      name: 'Mercury',
      color: '#8C7853',
      size: 0.25,
      orbitRadius: 4.5,
      speed: 4.15,
      emissive: '#5C4833',
      type: 'rocky' as PlanetType,
      surfaceRoughness: 0.95,
      surfaceDetail: 'cratered',
      rotationSpeed: 0.02,
      textureUrl: TEXTURE_PATH + '2k_mercury.jpg'
    },
    {
      name: 'Venus',
      color: '#E6C87A',
      size: 0.35,
      orbitRadius: 6.0,
      speed: 1.62,
      emissive: '#D4A84B',
      type: 'terrestrial' as PlanetType,
      hasAtmosphere: true,
      atmosphereColor: '#FFE4B5',
      atmosphereOpacity: 0.4,
      hasClouds: true,
      cloudColor: '#FFF8DC',
      cloudSpeed: 0.8,
      rotationSpeed: -0.01,
      textureUrl: TEXTURE_PATH + '2k_venus_surface.jpg',
      cloudsMapUrl: TEXTURE_PATH + '2k_venus_atmosphere.jpg'
    },
    {
      name: 'Earth',
      color: '#6B93D6',
      size: 0.38,
      orbitRadius: 8.0,
      speed: 1.0,
      emissive: '#1E4D7B',
      type: 'terrestrial' as PlanetType,
      hasAtmosphere: true,
      atmosphereColor: '#87CEEB',
      atmosphereOpacity: 0.25,
      hasClouds: true,
      cloudColor: '#FFFFFF',
      cloudSpeed: 1.2,
      hasMoon: true,
      rotationSpeed: 1.0,
      textureUrl: TEXTURE_PATH + '2k_earth_daymap.jpg',
      cloudsMapUrl: TEXTURE_PATH + '2k_earth_clouds.jpg'
    },
    {
      name: 'Mars',
      color: '#C1440E',
      size: 0.28,
      orbitRadius: 10.0,
      speed: 0.53,
      emissive: '#8B2500',
      type: 'rocky' as PlanetType,
      hasAtmosphere: true,
      atmosphereColor: '#FFB6C1',
      atmosphereOpacity: 0.08,
      surfaceRoughness: 0.85,
      rotationSpeed: 0.97,
      hasMoon: true,
      textureUrl: TEXTURE_PATH + '2k_mars.jpg'
    },
    {
      name: 'Jupiter',
      color: '#D8CA9D',
      size: 1.4,
      orbitRadius: 15.0, // adjusted for asteroid belt space
      speed: 0.084,
      emissive: '#8B7355',
      type: 'gas_giant' as PlanetType,
      hasAtmosphere: true,
      atmosphereColor: '#DEB887',
      atmosphereOpacity: 0.15,
      hasBands: true,
      bandColors: ['#D4A574', '#C19A6B', '#8B7355', '#CD853F', '#DEB887', '#F5DEB3'],
      hasStorm: true,
      stormColor: '#CD5C5C',
      stormPosition: [0.2, -0.15],
      rotationSpeed: 2.4,
      hasMoon: true,
      textureUrl: TEXTURE_PATH + '2k_jupiter.jpg'
    },
    {
      name: 'Saturn',
      color: '#F4D59E',
      size: 1.15,
      orbitRadius: 19.0,
      speed: 0.034,
      emissive: '#DAA520',
      type: 'gas_giant' as PlanetType,
      hasAtmosphere: true,
      atmosphereColor: '#FAEBD7',
      atmosphereOpacity: 0.12,
      hasBands: true,
      bandColors: ['#F5DEB3', '#DEB887', '#D2B48C', '#C4A46B', '#EED9B6'],
      hasRings: true,
      ringColors: ['#C9B896', '#A89070', '#D4C4A8', '#8B7355', '#C9B896'],
      ringGaps: [1.5, 1.8, 2.05],
      rotationSpeed: 2.2,
      tilt: 0.47,
      hasMoon: true,
      textureUrl: TEXTURE_PATH + '2k_saturn.jpg',
      ringMapUrl: TEXTURE_PATH + '2k_saturn_ring_alpha.png'
    },
    {
      name: 'Uranus',
      color: '#D1E7E7',
      size: 0.68,
      orbitRadius: 23.0,
      speed: 0.012,
      emissive: '#5F9EA0',
      type: 'ice_giant' as PlanetType,
      hasAtmosphere: true,
      atmosphereColor: '#E0FFFF',
      atmosphereOpacity: 0.2,
      hasBands: true,
      bandColors: ['#B0E0E6', '#87CEEB', '#ADD8E6', '#AFEEEE'],
      hasRings: true,
      ringColors: ['#4A5568', '#2D3748', '#A0AEC0'],
      tilt: Math.PI / 2,
      rotationSpeed: 1.4,
      hasMoon: true,
      textureUrl: TEXTURE_PATH + '2k_uranus.jpg'
    },
    {
      name: 'Neptune',
      color: '#5B5DDF',
      size: 0.65,
      orbitRadius: 27.0,
      speed: 0.006,
      emissive: '#4169E1',
      type: 'ice_giant' as PlanetType,
      hasAtmosphere: true,
      atmosphereColor: '#6495ED',
      atmosphereOpacity: 0.2,
      hasBands: true,
      bandColors: ['#4169E1', '#6495ED', '#1E90FF', '#4682B4'],
      hasStorm: true,
      stormColor: '#FFFFFF',
      stormPosition: [-0.2, 0.1],
      rotationSpeed: 1.5,
      hasMoon: true,
      textureUrl: TEXTURE_PATH + '2k_neptune.jpg'
    },
  ] as PlanetData[]
}

// ============================================================================
// EFFECTS & OBJECTS
// ============================================================================

function AsteroidBelt({ innerRadius, outerRadius, count }: { innerRadius: number, outerRadius: number, count: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useEffect(() => {
    if (!meshRef.current) return
    for (let i = 0; i < count; i++) {
      const radius = innerRadius + Math.random() * (outerRadius - innerRadius)
      const theta = Math.random() * Math.PI * 2
      const y = (Math.random() - 0.5) * 0.5

      dummy.position.set(Math.cos(theta) * radius, y, Math.sin(theta) * radius)
      
      const scale = Math.random() * 0.05 + 0.01
      dummy.scale.set(scale, scale, scale)
      
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [count, innerRadius, outerRadius, dummy])

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.02 // slowly rotate the entire belt
    }
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#887766" roughness={0.9} />
    </instancedMesh>
  )
}

function Comet() {
  const cometRef = useRef<THREE.Group>(null!)
  const timeRef = useRef(0)

  useFrame((_, delta) => {
    timeRef.current += delta * 0.5
    if (cometRef.current) {
      const r = 25
      const angle = timeRef.current
      // Elliptical orbit
      cometRef.current.position.set(Math.cos(angle) * r, Math.sin(angle * 2) * 5, Math.sin(angle) * r * 0.5)
      cometRef.current.lookAt(0, 0, 0)
    }
  })

  return (
    <group ref={cometRef}>
      <mesh>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Comet Tail */}
      <mesh position={[0, 0, -2]}>
        <coneGeometry args={[0.05, 4, 8]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  )
}

function NebulaBackground() {
  return (
    <mesh>
      <sphereGeometry args={[100, 32, 32]} />
      <meshBasicMaterial 
        color="#1a0033" 
        side={THREE.BackSide} 
        transparent 
        opacity={0.3} 
      />
    </mesh>
  )
}

function Star({ color, emissive, size, coronaColor, scrollVelocityRef, pulseRef, isMobile = false, surfaceActivity = false, textureUrl }: any) {
  const groupRef = useRef<THREE.Group>(null!)
  const starRef = useRef<THREE.Mesh>(null!)
  const coronaRef = useRef<THREE.Mesh>(null!)
  const surfaceRef = useRef<THREE.Mesh>(null!)
  
  const textures = useTexture([textureUrl || DEFAULT_TEXTURE])
  const sunTexture = textureUrl ? textures[0] : null

  useFrame((_, delta) => {
    if (groupRef.current) {
      const pulseScale = 1 + Math.sin(pulseRef.current) * 0.05
      groupRef.current.scale.setScalar(pulseScale)
    }
    if (starRef.current) {
      starRef.current.rotation.y += delta * 0.05
    }
    if (surfaceRef.current && surfaceActivity) {
      surfaceRef.current.rotation.y += delta * 0.1
    }
    if (coronaRef.current) {
      const velocity = Math.abs(scrollVelocityRef.current)
      const shimmer = 0.4 + Math.sin(pulseRef.current * 3) * 0.1 + velocity * 0.002
      const material = coronaRef.current.material as THREE.MeshBasicMaterial
      material.opacity = Math.min(shimmer, 0.6)
    }
  })

  return (
    <group ref={groupRef}>
      <mesh ref={starRef}>
        <sphereGeometry args={[size, 48, 48]} />
        <meshStandardMaterial
          map={sunTexture}
          color={sunTexture ? 'white' : color}
          emissive={emissive}
          emissiveIntensity={3}
          emissiveMap={sunTexture}
        />
      </mesh>
      
      {/* Surface granulation (sunspots/activity) */}
      {surfaceActivity && !isMobile && (
        <mesh ref={surfaceRef}>
          <sphereGeometry args={[size * 1.01, 32, 32]} />
          <meshBasicMaterial
            color="#FF4500"
            transparent
            opacity={0.08}
            wireframe
          />
        </mesh>
      )}

      {/* Enhanced Corona */}
      <mesh ref={coronaRef}>
        <sphereGeometry args={[size * 1.3, 48, 48]} />
        <meshBasicMaterial color={coronaColor} transparent opacity={0.4} blending={THREE.AdditiveBlending} side={THREE.BackSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[size * 1.8, 48, 48]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={0.2} blending={THREE.AdditiveBlending} side={THREE.BackSide} />
      </mesh>

      <pointLight color="#ffccaa" intensity={5} distance={500} decay={1.5} />
      <pointLight color="#a855f7" intensity={2} distance={200} decay={2} />
    </group>
  )
}

function Atmosphere({ size, color, opacity, isMobile = false }: any) {
  const segments = isMobile ? 16 : 48
  return (
    <>
      <mesh>
        <sphereGeometry args={[size * 1.04, segments, segments]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.8} side={THREE.BackSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[size * 1.08, segments, segments]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.5} side={THREE.BackSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[size * 1.18, segments, segments]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.25} side={THREE.BackSide} />
      </mesh>
    </>
  )
}

function CloudLayer({ size, color, speed, scrollVelocityRef, isMobile = false, textureUrl }: any) {
  const cloudRef = useRef<THREE.Mesh>(null!)
  const textures = useTexture([textureUrl || DEFAULT_TEXTURE])
  const cloudsTexture = textureUrl ? textures[0] : null

  useFrame((_, delta) => {
    if (cloudRef.current) {
      const velocity = scrollVelocityRef.current
      const isScrolling = Math.abs(velocity) > 0.1
      const boost = isScrolling ? Math.abs(velocity) * 0.002 : 0
      cloudRef.current.rotation.y += (delta * speed * 0.3 + boost)
    }
  })

  const segments = isMobile ? 16 : 32

  return (
    <mesh ref={cloudRef}>
      <sphereGeometry args={[size * 1.02, segments, segments]} />
      <meshStandardMaterial
        map={cloudsTexture}
        color={color}
        transparent
        opacity={textureUrl ? 0.9 : 0.4}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        roughness={1}
        metalness={0}
      />
    </mesh>
  )
}

function GasGiantBands({ size, colors, isMobile = false }: any) {
  const bandsRef = useRef<THREE.Group>(null!)
  const bandCount = isMobile ? 4 : colors.length

  return (
    <group ref={bandsRef}>
      {colors.slice(0, bandCount).map((color: string, index: number) => {
        const bandY = ((index / (bandCount - 1)) - 0.5) * size * 1.6
        const bandWidth = size * 0.15
        const bandRadius = Math.sqrt(size * size - bandY * bandY * 0.8) || size * 0.1

        return (
          <mesh key={index} position={[0, bandY, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[bandRadius, bandWidth, 8, isMobile ? 32 : 64]} />
            <meshBasicMaterial color={color} transparent opacity={0.25} />
          </mesh>
        )
      })}
    </group>
  )
}

function StormSpot({ size, color, position, scrollVelocityRef, isMobile = false }: any) {
  const stormRef = useRef<THREE.Group>(null!)
  const rotationRef = useRef(0)

  useFrame((_, delta) => {
    if (stormRef.current) {
      const velocity = scrollVelocityRef.current
      const isScrolling = Math.abs(velocity) > 0.1
      const boost = isScrolling ? Math.abs(velocity) * 0.003 : 0
      rotationRef.current += delta * 0.5 + boost
      stormRef.current.rotation.y = rotationRef.current
    }
  })

  const segments = isMobile ? 12 : 24
  const stormSize = size * 0.15

  return (
    <group ref={stormRef}>
      <mesh position={[position[0] * size, position[1] * size, size * 0.98]}>
        <sphereGeometry args={[stormSize, segments, segments]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
      <mesh position={[position[0] * size, position[1] * size, size * 0.97]}>
        <ringGeometry args={[stormSize, stormSize * 1.3, segments]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function IceCaps({ size, color, isMobile = false }: any) {
  const segments = isMobile ? 12 : 24
  return (
    <>
      <mesh position={[0, size * 0.85, 0]}>
        <sphereGeometry args={[size * 0.35, segments, segments, 0, Math.PI * 2, 0, Math.PI / 4]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} roughness={0.3} metalness={0.1} />
      </mesh>
      <mesh position={[0, -size * 0.85, 0]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[size * 0.3, segments, segments, 0, Math.PI * 2, 0, Math.PI / 4]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} roughness={0.3} metalness={0.1} />
      </mesh>
    </>
  )
}

function PlanetaryRings({ size, colors, gaps = [], tilt = 0, isMobile = false, textureUrl }: any) {
  const segments = isMobile ? 48 : 96
  const textures = useTexture([textureUrl || DEFAULT_TEXTURE])
  const ringTexture = textureUrl ? textures[0] : null

  if (textureUrl && ringTexture) {
    ringTexture.rotation = Math.PI / 2
    return (
      <group rotation={[Math.PI / 2 + tilt, 0, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 1.3, size * 2.4, segments]} />
          <meshStandardMaterial map={ringTexture} transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      </group>
    )
  }

  const rings = useMemo(() => {
    const ringData: { innerRadius: number; outerRadius: number; color: string }[] = []
    const baseInner = size * 1.3
    const baseOuter = size * 2.4
    const totalWidth = baseOuter - baseInner
    const bandWidth = totalWidth / colors.length

    colors.forEach((color: string, index: number) => {
      const inner = baseInner + index * bandWidth
      const outer = inner + bandWidth * 0.85

      const hasGap = gaps.some((g: number) => g > inner / size && g < outer / size)
      if (!hasGap) {
        ringData.push({ innerRadius: inner, outerRadius: outer, color })
      } else {
        const gapPos = gaps.find((g: number) => g > inner / size && g < outer / size)!
        ringData.push({ innerRadius: inner, outerRadius: gapPos * size - 0.02, color })
        ringData.push({ innerRadius: gapPos * size + 0.02, outerRadius: outer, color })
      }
    })

    return ringData
  }, [size, colors, gaps])

  return (
    <group rotation={[Math.PI / 2 + tilt * 0.3, 0, 0]}>
      {rings.map((ring, index) => (
        <mesh key={index}>
          <ringGeometry args={[ring.innerRadius, ring.outerRadius, segments]} />
          <meshBasicMaterial color={ring.color} transparent opacity={0.7 - index * 0.1} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, -0.01, 0]}>
        <ringGeometry args={[size * 1.3, size * 2.4, segments]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

const MOON_TEXTURE_URL = '/textures/2k_moon.jpg'

function Moon({ parentSize, scrollVelocityRef, isMobile = false }: any) {
  const moonRef = useRef<THREE.Group>(null!)
  const moonMeshRef = useRef<THREE.Mesh>(null!)
  const orbitAngleRef = useRef(Math.random() * Math.PI * 2)

  const textures = useTexture([MOON_TEXTURE_URL])
  const moonTexture = textures[0]
  
  useFrame((_, delta) => {
    const velocity = scrollVelocityRef.current
    const isScrolling = Math.abs(velocity) > 0.1

    const baseSpeed = delta * 2
    const scrollBoost = isScrolling ? Math.abs(velocity) * 0.01 : 0
    orbitAngleRef.current += baseSpeed + scrollBoost

    if (moonRef.current) {
      const moonOrbit = parentSize * 2.8
      moonRef.current.position.x = Math.cos(orbitAngleRef.current) * moonOrbit
      moonRef.current.position.z = Math.sin(orbitAngleRef.current) * moonOrbit
      moonRef.current.position.y = Math.sin(orbitAngleRef.current * 0.8) * (moonOrbit * 0.15)
    }

    if (moonMeshRef.current) {
      moonMeshRef.current.rotation.y += delta * 0.1
    }
  })

  const segments = isMobile ? 12 : 20
  const moonSize = parentSize * 0.27

  return (
    <group ref={moonRef}>
      <mesh ref={moonMeshRef} castShadow receiveShadow>
        <sphereGeometry args={[moonSize, segments, segments]} />
        <meshStandardMaterial
          map={!isMobile ? moonTexture : null}
          color={!isMobile ? 'white' : "#B8B8B8"}
          emissive="#606060"
          emissiveIntensity={0.05}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      {!isMobile && (
        <>
          <mesh position={[moonSize * 0.3, moonSize * 0.2, moonSize * 0.8]}>
            <circleGeometry args={[moonSize * 0.15, 16]} />
            <meshBasicMaterial color="#808080" transparent opacity={0.3} />
          </mesh>
          <mesh position={[-moonSize * 0.4, -moonSize * 0.1, moonSize * 0.85]}>
            <circleGeometry args={[moonSize * 0.12, 16]} />
            <meshBasicMaterial color="#707070" transparent opacity={0.25} />
          </mesh>
          <mesh position={[moonSize * 0.1, -moonSize * 0.4, moonSize * 0.88]}>
            <circleGeometry args={[moonSize * 0.1, 16]} />
            <meshBasicMaterial color="#909090" transparent opacity={0.2} />
          </mesh>
        </>
      )}
    </group>
  )
}

function Planet({
  color, emissive, size, orbitRadius, speed, type, scrollVelocityRef,
  hasAtmosphere, atmosphereColor, atmosphereOpacity,
  hasClouds, cloudColor, cloudSpeed,
  hasRings, ringColors, ringGaps,
  hasBands, bandColors,
  hasIceCaps, iceCapsColor,
  hasStorm, stormColor, stormPosition,
  hasMoon, tilt, rotationSpeed, surfaceRoughness,
  angleOffset, textureUrl, bumpMapUrl, normalMapUrl, specularMapUrl, cloudsMapUrl, ringMapUrl, isMobile
}: any) {
  const groupRef = useRef<THREE.Group>(null!)
  const planetRef = useRef<THREE.Mesh>(null!)
  const orbitAngleRef = useRef(angleOffset)
  
  const textures = useTexture([
    textureUrl || DEFAULT_TEXTURE,
    bumpMapUrl || DEFAULT_TEXTURE,
    normalMapUrl || DEFAULT_TEXTURE,
    specularMapUrl || DEFAULT_TEXTURE
  ])
  const textureMap = {
    map: textureUrl ? textures[0] : null,
    bumpMap: bumpMapUrl ? textures[1] : null,
    normalMap: normalMapUrl ? textures[2] : null,
    specularMap: specularMapUrl ? textures[3] : null,
  }

  useFrame((_, delta) => {
    const velocity = scrollVelocityRef.current
    const isScrolling = Math.abs(velocity) > 0.1
    const baseSpeed = delta * speed * 0.3
    const scrollBoost = isScrolling ? Math.abs(velocity) * 0.005 * speed : 0
    orbitAngleRef.current += baseSpeed + scrollBoost

    if (groupRef.current) {
      groupRef.current.position.x = Math.cos(orbitAngleRef.current) * orbitRadius
      groupRef.current.position.z = Math.sin(orbitAngleRef.current) * orbitRadius
    }

    if (planetRef.current) {
      planetRef.current.rotation.y += delta * rotationSpeed * 0.3
    }
  })

  const segments = isMobile ? 16 : 32
  const isHot = type === 'hot_jupiter'
  const isGasGiant = type === 'gas_giant' || type === 'ice_giant'

  return (
    <group ref={groupRef}>
      <group rotation={[0, 0, tilt || 0]}>
        <mesh ref={planetRef} castShadow receiveShadow>
          <sphereGeometry args={[size, segments, segments]} />
          <meshStandardMaterial
            {...textureMap}
            color={textureMap.map ? 'white' : color}
            emissive={emissive}
            emissiveIntensity={isHot ? 0.6 : 0.05}
            roughness={surfaceRoughness}
            metalness={isGasGiant ? 0 : 0.1}
          />
        </mesh>
        
        {type === 'rocky' && !isMobile && (
          <mesh>
            <sphereGeometry args={[size * 1.001, segments, segments]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.05} wireframe />
          </mesh>
        )}

        {hasBands && bandColors && bandColors.length > 0 && (
          <GasGiantBands size={size} colors={bandColors} isMobile={isMobile} />
        )}

        {hasStorm && stormPosition && (
          <StormSpot size={size} color={stormColor} position={stormPosition} scrollVelocityRef={scrollVelocityRef} isMobile={isMobile} />
        )}

        {hasIceCaps && (
          <IceCaps size={size} color={iceCapsColor} isMobile={isMobile} />
        )}

        {hasClouds && (
          <CloudLayer size={size} color={cloudColor} speed={cloudSpeed} scrollVelocityRef={scrollVelocityRef} isMobile={isMobile} textureUrl={cloudsMapUrl} />
        )}

        {hasAtmosphere && (
          <Atmosphere size={size} color={atmosphereColor} opacity={atmosphereOpacity} isMobile={isMobile} />
        )}

        {hasRings && ringColors && ringColors.length > 0 && (
          <PlanetaryRings size={size} colors={ringColors} gaps={ringGaps} tilt={tilt} isMobile={isMobile} textureUrl={ringMapUrl} />
        )}

        {hasMoon && (
          <Moon parentSize={size} scrollVelocityRef={scrollVelocityRef} isMobile={isMobile} />
        )}
      </group>
    </group>
  )
}

function OrbitPath({ radius, color = '#ffffff' }: { radius: number, color?: string }) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - 0.02, radius + 0.02, 128]} />
      <meshBasicMaterial color={color} transparent opacity={0.15} side={THREE.DoubleSide} />
    </mesh>
  )
}

export default function SolarSystemScene() {
  const groupRef = useRef<THREE.Group>(null!)
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

  useFrame((state, delta) => {
    const velocity = scrollVelocityRef.current
    scrollVelocityRef.current *= 0.92 // dampen
    pulseRef.current += delta + Math.abs(velocity) * 0.01

    if (groupRef.current) {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0
      
      const targetZ = 15 + progress * 10
      const targetY = 5 + progress * 8
      
      state.camera.position.z += (targetZ - state.camera.position.z) * 0.05
      state.camera.position.y += (targetY - state.camera.position.y) * 0.05
      
      groupRef.current.rotation.y += delta * 0.02
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.05
    }
  })

  return (
    <group ref={groupRef}>
      <NebulaBackground />
      <ambientLight intensity={0.2} color="#ec4899" />
      
      <Star
        {...OUR_SOLAR_SYSTEM.star}
        scrollVelocityRef={scrollVelocityRef}
        pulseRef={pulseRef}
      />

      <AsteroidBelt innerRadius={11} outerRadius={13} count={1500} />
      <Comet />

      {OUR_SOLAR_SYSTEM.planets.map((planet, index) => (
        <group key={planet.name}>
          <OrbitPath radius={planet.orbitRadius} color="#a855f7" />
          <Planet
            {...planet}
            scrollVelocityRef={scrollVelocityRef}
            angleOffset={(index / OUR_SOLAR_SYSTEM.planets.length) * Math.PI * 2}
          />
        </group>
      ))}
    </group>
  )
}
