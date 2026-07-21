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
  // Optional features
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
  surfaceDetail?: string // 'cratered' | 'smooth' | 'volcanic' | 'varied'
  textureUrl?: string
  bumpMapUrl?: string
  normalMapUrl?: string
  specularMapUrl?: string
  cloudsMapUrl?: string
  ringMapUrl?: string
}

// ============================================================================
// SYSTEM DATA - REALISTIC
// ============================================================================

// Use local textures only - remote GitHub URL no longer exists
const TEXTURE_PATH = '/textures/'
const DEFAULT_TEXTURE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

const OUR_SOLAR_SYSTEM: SolarSystemData = {
  name: 'Solar System',
  star: {
    name: 'Sun',
    color: '#FDB813',
    emissive: '#FF8C00',
    size: 3.2,
    coronaColor: '#FFD700',
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
      rotationSpeed: -0.01, // Retrograde rotation
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
      hasIceCaps: false, // Disabled - visible in texture
      iceCapsColor: '#FFFFFF',
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
      hasIceCaps: false, // Visible in texture
      iceCapsColor: '#F0F8FF',
      surfaceRoughness: 0.85,
      rotationSpeed: 0.97,
      hasMoon: true, // Phobos & Deimos
      textureUrl: TEXTURE_PATH + '2k_mars.jpg'
    },
    {
      name: 'Jupiter',
      color: '#D8CA9D',
      size: 1.4,
      orbitRadius: 14.0,
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
      rotationSpeed: 2.4, // Fast rotation
      hasMoon: true, // Galilean moons
      textureUrl: TEXTURE_PATH + '2k_jupiter.jpg'
    },
    {
      name: 'Saturn',
      color: '#F4D59E',
      size: 1.15,
      orbitRadius: 18.0,
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
      ringGaps: [1.5, 1.8, 2.05], // Cassini division etc.
      rotationSpeed: 2.2,
      tilt: 0.47, // Saturn's axial tilt
      hasMoon: true, // Titan etc.
      textureUrl: TEXTURE_PATH + '2k_saturn.jpg',
      ringMapUrl: TEXTURE_PATH + '2k_saturn_ring_alpha.png'
    },
    {
      name: 'Uranus',
      color: '#D1E7E7',
      size: 0.68,
      orbitRadius: 22.0,
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
      tilt: Math.PI / 2, // Extreme tilt
      rotationSpeed: 1.4,
      hasMoon: true, // Miranda, Ariel, etc.
      textureUrl: TEXTURE_PATH + '2k_uranus.jpg'
    },
    {
      name: 'Neptune',
      color: '#5B5DDF',
      size: 0.65,
      orbitRadius: 26.0,
      speed: 0.006,
      emissive: '#4169E1',
      type: 'ice_giant' as PlanetType,
      hasAtmosphere: true,
      atmosphereColor: '#6495ED',
      atmosphereOpacity: 0.2,
      hasBands: true, // Visible in texture
      bandColors: ['#4169E1', '#6495ED', '#1E90FF', '#4682B4'],
      hasStorm: true, // Visible in texture
      stormColor: '#FFFFFF',
      stormPosition: [-0.2, 0.1],
      rotationSpeed: 1.5,
      hasMoon: true, // Triton
      textureUrl: TEXTURE_PATH + '2k_neptune.jpg'
    },
  ] as PlanetData[]
}

// Known Exoplanet Systems - simplified but with types
const EXOPLANET_SYSTEMS: SolarSystemData[] = [
  {
    name: 'TRAPPIST-1',
    star: { name: 'TRAPPIST-1', color: '#FF6B6B', emissive: '#8B0000', size: 0.6, coronaColor: '#FF4444' },
    planets: [
      { name: 'TRAPPIST-1b', color: '#8B4513', size: 0.11, orbitRadius: 1.8, speed: 2.5, emissive: '#654321', type: 'rocky' as PlanetType },
      { name: 'TRAPPIST-1c', color: '#A0522D', size: 0.11, orbitRadius: 2.2, speed: 2.0, emissive: '#8B4513', type: 'rocky' as PlanetType },
      { name: 'TRAPPIST-1d', color: '#6B8E23', size: 0.08, orbitRadius: 2.6, speed: 1.6, emissive: '#556B2F', type: 'terrestrial' as PlanetType, hasAtmosphere: true, atmosphereColor: '#90EE90', atmosphereOpacity: 0.15 },
      { name: 'TRAPPIST-1e', color: '#4682B4', size: 0.09, orbitRadius: 3.0, speed: 1.3, emissive: '#2F4F4F', type: 'terrestrial' as PlanetType, hasAtmosphere: true, atmosphereColor: '#87CEEB', atmosphereOpacity: 0.2 },
      { name: 'TRAPPIST-1f', color: '#5F9EA0', size: 0.10, orbitRadius: 3.4, speed: 1.0, emissive: '#008B8B', type: 'terrestrial' as PlanetType, hasAtmosphere: true, atmosphereColor: '#B0E0E6', atmosphereOpacity: 0.18, hasIceCaps: true, iceCapsColor: '#E0FFFF' },
      { name: 'TRAPPIST-1g', color: '#708090', size: 0.11, orbitRadius: 3.8, speed: 0.8, emissive: '#2F4F4F', type: 'ice_giant' as PlanetType },
      { name: 'TRAPPIST-1h', color: '#B0C4DE', size: 0.08, orbitRadius: 4.2, speed: 0.6, emissive: '#4682B4', type: 'ice_giant' as PlanetType, hasIceCaps: true, iceCapsColor: '#FFFFFF' },
    ] as PlanetData[]
  },
  {
    name: 'Proxima Centauri',
    star: { name: 'Proxima Centauri', color: '#FF8C69', emissive: '#CD5C5C', size: 0.5, coronaColor: '#FA8072' },
    planets: [
      { name: 'Proxima b', color: '#8FBC8F', size: 0.13, orbitRadius: 2.5, speed: 1.5, emissive: '#228B22', type: 'terrestrial' as PlanetType, hasAtmosphere: true, atmosphereColor: '#98FB98', atmosphereOpacity: 0.2 },
      { name: 'Proxima c', color: '#DEB887', size: 0.28, orbitRadius: 4.0, speed: 0.3, emissive: '#D2691E', type: 'super_earth' as PlanetType },
      { name: 'Proxima d', color: '#A9A9A9', size: 0.06, orbitRadius: 1.8, speed: 3.0, emissive: '#696969', type: 'rocky' as PlanetType },
    ] as PlanetData[]
  },
  {
    name: 'Kepler-452',
    star: { name: 'Kepler-452', color: '#FFE4B5', emissive: '#DAA520', size: 1.1, coronaColor: '#FFDAB9' },
    planets: [
      { name: 'Kepler-452b', color: '#6B8E23', size: 0.18, orbitRadius: 3.8, speed: 0.9, emissive: '#556B2F', type: 'super_earth' as PlanetType, hasAtmosphere: true, atmosphereColor: '#90EE90', atmosphereOpacity: 0.25, hasClouds: true, cloudColor: '#FFFFFF', cloudSpeed: 0.8 },
    ] as PlanetData[]
  },
  {
    name: 'Kepler-186',
    star: { name: 'Kepler-186', color: '#E9967A', emissive: '#CD5C5C', size: 0.65, coronaColor: '#FA8072' },
    planets: [
      { name: 'Kepler-186b', color: '#8B4513', size: 0.10, orbitRadius: 1.6, speed: 3.2, emissive: '#654321', type: 'rocky' as PlanetType },
      { name: 'Kepler-186c', color: '#A0522D', size: 0.12, orbitRadius: 2.0, speed: 2.1, emissive: '#8B4513', type: 'rocky' as PlanetType },
      { name: 'Kepler-186d', color: '#BC8F8F', size: 0.13, orbitRadius: 2.5, speed: 1.5, emissive: '#CD5C5C', type: 'rocky' as PlanetType },
      { name: 'Kepler-186e', color: '#9ACD32', size: 0.14, orbitRadius: 3.0, speed: 1.0, emissive: '#6B8E23', type: 'terrestrial' as PlanetType, hasAtmosphere: true, atmosphereColor: '#ADFF2F', atmosphereOpacity: 0.15 },
      { name: 'Kepler-186f', color: '#20B2AA', size: 0.11, orbitRadius: 3.8, speed: 0.65, emissive: '#008B8B', type: 'terrestrial' as PlanetType, hasAtmosphere: true, atmosphereColor: '#40E0D0', atmosphereOpacity: 0.2, hasIceCaps: true, iceCapsColor: '#E0FFFF' },
    ] as PlanetData[]
  },
  {
    name: '55 Cancri',
    star: { name: '55 Cancri A', color: '#FFD700', emissive: '#FFA500', size: 0.95, coronaColor: '#FFE4B5' },
    planets: [
      { name: '55 Cancri e', color: '#FF6347', size: 0.18, orbitRadius: 1.5, speed: 5.0, emissive: '#DC143C', type: 'hot_jupiter' as PlanetType, hasAtmosphere: true, atmosphereColor: '#FF4500', atmosphereOpacity: 0.3 },
      { name: '55 Cancri b', color: '#DAA520', size: 0.35, orbitRadius: 2.4, speed: 1.8, emissive: '#B8860B', type: 'gas_giant' as PlanetType, hasBands: true, bandColors: ['#DAA520', '#CD853F', '#B8860B'] },
      { name: '55 Cancri c', color: '#BDB76B', size: 0.32, orbitRadius: 3.2, speed: 1.1, emissive: '#808000', type: 'gas_giant' as PlanetType, hasBands: true, bandColors: ['#BDB76B', '#9ACD32', '#6B8E23'] },
      { name: '55 Cancri f', color: '#778899', size: 0.30, orbitRadius: 4.5, speed: 0.5, emissive: '#708090', type: 'gas_giant' as PlanetType },
      { name: '55 Cancri d', color: '#D2691E', size: 0.55, orbitRadius: 6.0, speed: 0.15, emissive: '#8B4513', type: 'gas_giant' as PlanetType, hasBands: true, bandColors: ['#D2691E', '#CD853F', '#8B4513', '#A0522D'], hasRings: true, ringColors: ['#8B7355', '#6B4423'] },
    ] as PlanetData[]
  },
  {
    name: 'Gliese 667C',
    star: { name: 'Gliese 667C', color: '#FF7F50', emissive: '#CD5C5C', size: 0.55, coronaColor: '#FF6347' },
    planets: [
      { name: 'Gliese 667Cb', color: '#8B4513', size: 0.14, orbitRadius: 1.8, speed: 2.8, emissive: '#654321', type: 'super_earth' as PlanetType },
      { name: 'Gliese 667Cc', color: '#2E8B57', size: 0.16, orbitRadius: 2.4, speed: 1.8, emissive: '#006400', type: 'super_earth' as PlanetType, hasAtmosphere: true, atmosphereColor: '#3CB371', atmosphereOpacity: 0.22 },
      { name: 'Gliese 667Cf', color: '#4682B4', size: 0.15, orbitRadius: 3.0, speed: 1.2, emissive: '#2F4F4F', type: 'super_earth' as PlanetType, hasAtmosphere: true, atmosphereColor: '#5F9EA0', atmosphereOpacity: 0.18 },
      { name: 'Gliese 667Ce', color: '#5F9EA0', size: 0.14, orbitRadius: 3.6, speed: 0.8, emissive: '#008B8B', type: 'super_earth' as PlanetType, hasIceCaps: true, iceCapsColor: '#E0FFFF' },
    ] as PlanetData[]
  },
  {
    name: 'HD 219134',
    star: { name: 'HD 219134', color: '#FFA07A', emissive: '#E9967A', size: 0.78, coronaColor: '#FFDAB9' },
    planets: [
      { name: 'HD 219134 b', color: '#B22222', size: 0.15, orbitRadius: 1.6, speed: 4.5, emissive: '#8B0000', type: 'rocky' as PlanetType },
      { name: 'HD 219134 c', color: '#CD853F', size: 0.16, orbitRadius: 2.0, speed: 3.2, emissive: '#8B4513', type: 'rocky' as PlanetType },
      { name: 'HD 219134 f', color: '#9370DB', size: 0.14, orbitRadius: 2.6, speed: 2.0, emissive: '#6A5ACD', type: 'super_earth' as PlanetType },
      { name: 'HD 219134 d', color: '#708090', size: 0.17, orbitRadius: 3.4, speed: 1.1, emissive: '#2F4F4F', type: 'super_earth' as PlanetType },
      { name: 'HD 219134 g', color: '#4169E1', size: 0.13, orbitRadius: 4.2, speed: 0.6, emissive: '#00008B', type: 'ice_giant' as PlanetType, hasAtmosphere: true, atmosphereColor: '#6495ED', atmosphereOpacity: 0.2 },
      { name: 'HD 219134 h', color: '#6495ED', size: 0.28, orbitRadius: 5.2, speed: 0.25, emissive: '#4169E1', type: 'ice_giant' as PlanetType, hasBands: true, bandColors: ['#6495ED', '#4169E1', '#1E90FF'] },
    ] as PlanetData[]
  },
  {
    name: 'WASP-12',
    star: { name: 'WASP-12', color: '#FFFACD', emissive: '#FFD700', size: 1.3, coronaColor: '#FFF8DC' },
    planets: [
      { name: 'WASP-12b', color: '#FF4500', size: 0.65, orbitRadius: 2.0, speed: 6.0, emissive: '#DC143C', type: 'hot_jupiter' as PlanetType, hasAtmosphere: true, atmosphereColor: '#FF6347', atmosphereOpacity: 0.35, hasBands: true, bandColors: ['#FF4500', '#FF6347', '#FF8C00', '#DC143C'] },
    ] as PlanetData[]
  },
  {
    name: 'TOI-700',
    star: { name: 'TOI-700', color: '#FF6B6B', emissive: '#CD5C5C', size: 0.55, coronaColor: '#FF4444' },
    planets: [
      { name: 'TOI-700 b', color: '#8B7355', size: 0.10, orbitRadius: 1.8, speed: 2.5, emissive: '#6B4423', type: 'rocky' as PlanetType },
      { name: 'TOI-700 c', color: '#B8860B', size: 0.25, orbitRadius: 2.4, speed: 1.6, emissive: '#8B6914', type: 'gas_giant' as PlanetType, hasBands: true, bandColors: ['#B8860B', '#DAA520', '#CD853F'] },
      { name: 'TOI-700 d', color: '#3CB371', size: 0.11, orbitRadius: 3.2, speed: 1.0, emissive: '#228B22', type: 'terrestrial' as PlanetType, hasAtmosphere: true, atmosphereColor: '#90EE90', atmosphereOpacity: 0.2, hasClouds: true, cloudColor: '#FFFFFF', cloudSpeed: 0.6 },
      { name: 'TOI-700 e', color: '#4682B4', size: 0.10, orbitRadius: 2.8, speed: 1.3, emissive: '#2F4F4F', type: 'terrestrial' as PlanetType, hasAtmosphere: true, atmosphereColor: '#87CEEB', atmosphereOpacity: 0.18 },
    ] as PlanetData[]
  },
]



interface SolarSystemData {
  name: string
  star: {
    name: string
    color: string
    emissive: string
    size: number
    coronaColor: string
    surfaceActivity?: boolean
    textureUrl?: string
  }
  planets: PlanetData[]
}

interface SolarSystemInstanceProps {
  systemData: SolarSystemData
  scale?: number
  position?: [number, number, number]
  scrollVelocityRef: React.MutableRefObject<number>
  pulseRef: React.MutableRefObject<number>
  orbitAngleRef?: React.MutableRefObject<number>
  orbitRadius?: number
  orbitSpeed?: number
  angleOffset?: number
  isMobile?: boolean
}

// ============================================================================
// COMPONENT INTERFACES
// ============================================================================

interface StarProps {
  color: string
  emissive: string
  size: number
  coronaColor: string
  scrollVelocityRef: React.MutableRefObject<number>
  pulseRef: React.MutableRefObject<number>
  isMobile?: boolean
  surfaceActivity?: boolean
  textureUrl?: string
}

interface PlanetProps extends PlanetData {
  scrollVelocityRef: React.MutableRefObject<number>
  isMobile?: boolean
  angleOffset?: number
  textureUrl?: string
}

// ============================================================================
// STAR COMPONENT - Enhanced with surface activity
// ============================================================================

function Star({ color, emissive, size, coronaColor, scrollVelocityRef, pulseRef, isMobile = false, surfaceActivity = false, textureUrl }: StarProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const starRef = useRef<THREE.Mesh>(null!)
  const coronaRef = useRef<THREE.Mesh>(null!)
  const surfaceRef = useRef<THREE.Mesh>(null!)

  const sunTexture = useTexture(textureUrl || DEFAULT_TEXTURE)

  useFrame((_, delta) => {
    if (groupRef.current) {
      const pulseScale = 1 + Math.sin(pulseRef.current) * 0.03
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
      const shimmer = 0.2 + Math.sin(pulseRef.current * 2) * 0.08 + velocity * 0.002
      const material = coronaRef.current.material as THREE.MeshBasicMaterial
      material.opacity = Math.min(shimmer, 0.4)
    }
  })

  const segments = isMobile ? 20 : 48

  return (
    <group ref={groupRef}>
      {/* Star core */}
      <mesh ref={starRef}>
        <sphereGeometry args={[size, segments, segments]} />
        <meshStandardMaterial
          map={textureUrl ? sunTexture : null}
          color={textureUrl ? 'white' : color}
          emissive={emissive}
          emissiveIntensity={2.5}
          emissiveMap={textureUrl ? sunTexture : null}
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* Surface granulation (sunspots/activity) */}
      {surfaceActivity && !isMobile && (
        <mesh ref={surfaceRef}>
          <sphereGeometry args={[size * 1.01, segments, segments]} />
          <meshBasicMaterial
            color="#FF4500"
            transparent
            opacity={0.08}
            wireframe
          />
        </mesh>
      )}

      {/* Inner corona glow - brightest layer */}
      <mesh ref={coronaRef}>
        <sphereGeometry args={[size * 1.25, segments, segments]} />
        <meshBasicMaterial
          color={coronaColor}
          transparent
          opacity={0.25}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Mid corona - softer glow */}
      <mesh>
        <sphereGeometry args={[size * 1.5, segments, segments]} />
        <meshBasicMaterial
          color={coronaColor}
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Ambient light for base visibility */}
      <ambientLight intensity={0.5} />

      {/* Outer corona - extended haze */}
      <mesh>
        <sphereGeometry args={[size * 1.9, segments, segments]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.06}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Solar wind / extended atmosphere */}
      <mesh>
        <sphereGeometry args={[size * 2.8, isMobile ? 16 : 32, isMobile ? 16 : 32]} />
        <meshBasicMaterial
          color={coronaColor}
          transparent
          opacity={0.02}
          side={THREE.BackSide}
        />
      </mesh>

      <pointLight 
        color={color} 
        intensity={6} 
        distance={400} 
        decay={1} 
        castShadow={!isMobile}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      
      {/* Secondary warm light for better planet illumination */}
      <pointLight 
        color="#FFF5E6" 
        intensity={1.5} 
        distance={150} 
        decay={2} 
      />
    </group>
  )
}

// ============================================================================
// ATMOSPHERE COMPONENT
// ============================================================================

interface AtmosphereProps {
  size: number
  color: string
  opacity: number
  isMobile?: boolean
}

function Atmosphere({ size, color, opacity, isMobile = false }: AtmosphereProps) {
  const segments = isMobile ? 16 : 48

  return (
    <>
      {/* Inner atmosphere - sharp edge glow (Fresnel-like effect) */}
      <mesh>
        <sphereGeometry args={[size * 1.04, segments, segments]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity * 0.8}
          side={THREE.BackSide}
        />
      </mesh>
      {/* Mid atmosphere layer */}
      <mesh>
        <sphereGeometry args={[size * 1.08, segments, segments]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity * 0.5}
          side={THREE.BackSide}
        />
      </mesh>
      {/* Outer atmospheric haze - soft extended glow */}
      <mesh>
        <sphereGeometry args={[size * 1.18, segments, segments]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity * 0.25}
          side={THREE.BackSide}
        />
      </mesh>
    </>
  )
}

// ============================================================================
// CLOUD LAYER COMPONENT
// ============================================================================

interface CloudLayerProps {
  size: number
  color: string
  speed: number
  scrollVelocityRef: React.MutableRefObject<number>
  isMobile?: boolean
  textureUrl?: string
}

function CloudLayer({ size, color, speed, scrollVelocityRef, isMobile = false, textureUrl }: CloudLayerProps) {
  const cloudRef = useRef<THREE.Mesh>(null!)
  const cloudsTexture = useTexture(textureUrl || DEFAULT_TEXTURE)

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
        map={textureUrl ? cloudsTexture : null}
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

// ============================================================================
// GAS GIANT BANDS COMPONENT
// ============================================================================

interface BandsProps {
  size: number
  colors: string[]
  isMobile?: boolean
}

function GasGiantBands({ size, colors, isMobile = false }: BandsProps) {
  const bandsRef = useRef<THREE.Group>(null!)
  const bandCount = isMobile ? 4 : colors.length

  return (
    <group ref={bandsRef}>
      {colors.slice(0, bandCount).map((color, index) => {
        const bandY = ((index / (bandCount - 1)) - 0.5) * size * 1.6
        const bandWidth = size * 0.15
        const bandRadius = Math.sqrt(size * size - bandY * bandY * 0.8) || size * 0.1

        return (
          <mesh key={index} position={[0, bandY, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[bandRadius, bandWidth, 8, isMobile ? 32 : 64]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.25}
            />
          </mesh>
        )
      })}
    </group>
  )
}

// ============================================================================
// STORM SPOT COMPONENT (Great Red Spot, etc.)
// ============================================================================

interface StormSpotProps {
  size: number
  color: string
  position: [number, number]
  scrollVelocityRef: React.MutableRefObject<number>
  isMobile?: boolean
}

function StormSpot({ size, color, position, scrollVelocityRef, isMobile = false }: StormSpotProps) {
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
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.8}
        />
      </mesh>
      {/* Storm outer ring */}
      <mesh position={[position[0] * size, position[1] * size, size * 0.97]}>
        <ringGeometry args={[stormSize, stormSize * 1.3, segments]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

// ============================================================================
// ICE CAPS COMPONENT
// ============================================================================

interface IceCapsProps {
  size: number
  color: string
  isMobile?: boolean
}

function IceCaps({ size, color, isMobile = false }: IceCapsProps) {
  const segments = isMobile ? 12 : 24

  return (
    <>
      {/* North polar cap */}
      <mesh position={[0, size * 0.85, 0]}>
        <sphereGeometry args={[size * 0.35, segments, segments, 0, Math.PI * 2, 0, Math.PI / 4]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.2}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      {/* South polar cap */}
      <mesh position={[0, -size * 0.85, 0]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[size * 0.3, segments, segments, 0, Math.PI * 2, 0, Math.PI / 4]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.2}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
    </>
  )
}

// ============================================================================
// SATURN-STYLE RINGS COMPONENT
// ============================================================================

interface RingsProps {
  size: number
  colors: string[]
  gaps?: number[]
  tilt?: number
  isMobile?: boolean
  textureUrl?: string
}

function PlanetaryRings({ size, colors, gaps = [], tilt = 0, isMobile = false, textureUrl }: RingsProps) {
  const segments = isMobile ? 48 : 96
  const ringTexture = useTexture(textureUrl || DEFAULT_TEXTURE)

  if (textureUrl) {
    ringTexture.rotation = Math.PI / 2
    return (
      <group rotation={[Math.PI / 2 + tilt, 0, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 1.3, size * 2.4, segments]} />
          <meshStandardMaterial
            map={ringTexture}
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    )
  }

  // Create ring bands with gaps
  const rings = useMemo(() => {
    const ringData: { innerRadius: number; outerRadius: number; color: string }[] = []
    const baseInner = size * 1.3
    const baseOuter = size * 2.4
    const totalWidth = baseOuter - baseInner
    const bandWidth = totalWidth / colors.length

    colors.forEach((color, index) => {
      const inner = baseInner + index * bandWidth
      const outer = inner + bandWidth * 0.85 // Small gap between bands

      // Check if this band should have a gap
      const hasGap = gaps.some(g => g > inner / size && g < outer / size)
      if (!hasGap) {
        ringData.push({ innerRadius: inner, outerRadius: outer, color })
      } else {
        // Split the band around the gap
        const gapPos = gaps.find(g => g > inner / size && g < outer / size)!
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
          <meshBasicMaterial
            color={ring.color}
            transparent
            opacity={0.7 - index * 0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {/* Ring shadow/depth */}
      <mesh position={[0, -0.01, 0]}>
        <ringGeometry args={[size * 1.3, size * 2.4, segments]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

// ============================================================================
// MOON COMPONENT - Enhanced with craters
// ============================================================================

interface MoonProps {
  parentSize: number
  scrollVelocityRef: React.MutableRefObject<number>
  isMobile?: boolean
  textureUrl?: string
}

const MOON_TEXTURE_URL = '/textures/2k_moon.jpg'

function Moon({ parentSize, scrollVelocityRef, isMobile = false }: MoonProps) {
  const moonRef = useRef<THREE.Group>(null!)
  const moonMeshRef = useRef<THREE.Mesh>(null!)
  const orbitAngleRef = useRef(Math.random() * Math.PI * 2)

  // Try to load texture for moon if not mobile
  const moonTexture = useTexture(MOON_TEXTURE_URL)
  
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
      {/* Moon body */}
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

      {/* Crater hints (darker spots) */}
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

// ============================================================================
// MAIN PLANET COMPONENT - Fully featured
// ============================================================================

function Planet({
  color,
  emissive,
  size,
  orbitRadius,
  speed,
  type,
  scrollVelocityRef,
  isMobile = false,
  hasAtmosphere = false,
  atmosphereColor = '#87CEEB',
  atmosphereOpacity = 0.2,
  hasClouds = false,
  cloudColor = '#FFFFFF',
  cloudSpeed = 1,
  hasRings = false,
  ringColors = [],
  ringGaps = [],
  hasBands = false,
  bandColors = [],
  hasIceCaps = false,
  iceCapsColor = '#FFFFFF',
  hasStorm = false,
  stormColor = '#FFFFFF',
  stormPosition = [0, 0],
  hasMoon = false,
  tilt = 0,
  rotationSpeed = 1,
  surfaceRoughness = 0.7,
  angleOffset = 0,
  textureUrl,
  bumpMapUrl,
  normalMapUrl,
  specularMapUrl,
  cloudsMapUrl,
  ringMapUrl
}: PlanetProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const planetRef = useRef<THREE.Mesh>(null!)
  const orbitAngleRef = useRef(angleOffset)

  const [texture, bumpMap, normalMap, specularMap] = useTexture([
    textureUrl || DEFAULT_TEXTURE,
    bumpMapUrl || DEFAULT_TEXTURE,
    normalMapUrl || DEFAULT_TEXTURE,
    specularMapUrl || DEFAULT_TEXTURE
  ])

  // Clean empty/default textures to null
  const textures = {
    map: textureUrl ? texture : null,
    bumpMap: bumpMapUrl ? bumpMap : null,
    normalMap: normalMapUrl ? normalMap : null,
    specularMap: specularMapUrl ? specularMap : null,
  }

  useFrame((_, delta) => {
    const velocity = scrollVelocityRef.current
    const isScrolling = Math.abs(velocity) > 0.1

    // Base orbital motion
    const baseSpeed = delta * speed * 0.3
    const scrollBoost = isScrolling ? Math.abs(velocity) * 0.005 * speed : 0
    orbitAngleRef.current += baseSpeed + scrollBoost

    if (groupRef.current) {
      groupRef.current.position.x = Math.cos(orbitAngleRef.current) * orbitRadius
      groupRef.current.position.z = Math.sin(orbitAngleRef.current) * orbitRadius
      groupRef.current.position.y = 0
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
      <group rotation={[0, 0, tilt]}>
        {/* Planet body */}
        <mesh ref={planetRef} castShadow receiveShadow>
          <sphereGeometry args={[size, segments, segments]} />
          <meshStandardMaterial
            {...textures}
            color={textures.map ? 'white' : color}
            emissive={emissive}
            emissiveIntensity={isHot ? 0.6 : 0.05}
            roughness={surfaceRoughness}
            metalness={isGasGiant ? 0 : 0.1}
          />
        </mesh>

        {/* Surface detail for rocky planets */}
        {type === 'rocky' && !isMobile && (
          <mesh>
            <sphereGeometry args={[size * 1.001, segments, segments]} />
            <meshBasicMaterial
              color="#000000"
              transparent
              opacity={0.05}
              wireframe
            />
          </mesh>
        )}

        {/* Gas giant bands */}
        {hasBands && bandColors.length > 0 && (
          <GasGiantBands size={size} colors={bandColors} isMobile={isMobile} />
        )}

        {/* Storm spot */}
        {hasStorm && stormPosition && (
          <StormSpot
            size={size}
            color={stormColor}
            position={stormPosition as [number, number]}
            scrollVelocityRef={scrollVelocityRef}
            isMobile={isMobile}
          />
        )}

        {/* Ice caps */}
        {hasIceCaps && (
          <IceCaps size={size} color={iceCapsColor} isMobile={isMobile} />
        )}

        {/* Cloud layer */}
        {hasClouds && (
          <CloudLayer
            size={size}
            color={cloudColor}
            speed={cloudSpeed}
            scrollVelocityRef={scrollVelocityRef}
            isMobile={isMobile}
            textureUrl={cloudsMapUrl}
          />
        )}

        {/* Atmosphere */}
        {hasAtmosphere && (
          <Atmosphere
            size={size}
            color={atmosphereColor}
            opacity={atmosphereOpacity}
            isMobile={isMobile}
          />
        )}

        {/* Rings */}
        {hasRings && ringColors.length > 0 && (
          <PlanetaryRings
            size={size}
            colors={ringColors}
            gaps={ringGaps}
            tilt={tilt}
            isMobile={isMobile}
            textureUrl={ringMapUrl}
          />
        )}

        {/* Moon */}
        {hasMoon && (
          <Moon
            parentSize={size}
            scrollVelocityRef={scrollVelocityRef}
            isMobile={isMobile}
          />
        )}
      </group>
    </group>
  )
}

// ============================================================================
// ORBIT PATH COMPONENT
// ============================================================================

interface OrbitPathProps {
  radius: number
  color?: string
  isMobile?: boolean
}

function OrbitPath({ radius, color = '#ffffff', isMobile = false }: OrbitPathProps) {
  const segments = isMobile ? 64 : 128

  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - 0.04, radius + 0.04, segments]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.35}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// ============================================================================
// SOLAR SYSTEM INSTANCE COMPONENT
// ============================================================================

function SolarSystemInstance({
  systemData,
  scale = 1,
  position = [0, 0, 0],
  scrollVelocityRef,
  pulseRef,
  orbitAngleRef,
  orbitRadius = 0,
  orbitSpeed = 1,
  angleOffset = 0,
  isMobile = false
}: SolarSystemInstanceProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const localRotationRef = useRef({ x: 0, y: 0, z: 0 })
  const timeRef = useRef(Math.random() * 100) // Random start offset for variety

  const planets = systemData.planets

  useFrame((_, delta) => {
    const velocity = scrollVelocityRef.current
    const isScrolling = Math.abs(velocity) > 0.1
    
    // Advance time for continuous motion
    timeRef.current += delta

    if (groupRef.current) {
      // Scroll-driven rotation
      if (isScrolling) {
        localRotationRef.current.y += velocity * 0.001 * orbitSpeed
        localRotationRef.current.x += velocity * 0.0003 * orbitSpeed
        localRotationRef.current.z += velocity * 0.0002 * orbitSpeed
      }
      
      // Continuous gentle drift motion (independent of scroll)
      const driftX = Math.sin(timeRef.current * 0.3 + angleOffset) * 0.08
      const driftY = Math.cos(timeRef.current * 0.2 + angleOffset * 0.5) * 0.05
      const driftZ = Math.sin(timeRef.current * 0.15 + angleOffset * 0.7) * 0.04

      groupRef.current.rotation.y = localRotationRef.current.y + driftY
      groupRef.current.rotation.x = Math.sin(localRotationRef.current.x) * 0.15 + driftX
      groupRef.current.rotation.z = Math.sin(localRotationRef.current.z) * 0.1 + driftZ

      if (orbitAngleRef && orbitRadius > 0) {
        const angle = orbitAngleRef.current * orbitSpeed + angleOffset
        groupRef.current.position.x = position[0] + Math.cos(angle) * orbitRadius
        groupRef.current.position.y = position[1] + Math.sin(angle * 0.7) * (orbitRadius * 0.5)
        groupRef.current.position.z = position[2] + Math.sin(angle) * orbitRadius
      }
    }
  })

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <Star
        color={systemData.star.color}
        emissive={systemData.star.emissive}
        size={systemData.star.size}
        coronaColor={systemData.star.coronaColor}
        scrollVelocityRef={scrollVelocityRef}
        pulseRef={pulseRef}
        isMobile={isMobile}
        surfaceActivity={'surfaceActivity' in systemData.star && systemData.star.surfaceActivity}
        textureUrl={systemData.star.textureUrl}
      />

      {planets.map((planet: PlanetData, index: number) => (
        <OrbitPath
          key={`orbit-${index}`}
          radius={planet.orbitRadius}
          color={systemData.star.color}
          isMobile={isMobile}
        />
      ))}

      {planets.map((planet: PlanetData, index: number) => (
        <Planet
          key={planet.name}
          {...planet}
          scrollVelocityRef={scrollVelocityRef}
          isMobile={isMobile}
          angleOffset={(index / planets.length) * Math.PI * 2}
        />
      ))}
    </group>
  )
}

// ============================================================================
// MAIN SOLAR SYSTEM COMPONENT
// ============================================================================

interface SolarSystemProps {
  isMobile?: boolean
}

export default function SolarSystem({ isMobile = false }: SolarSystemProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const lastScrollRef = useRef(0)
  const scrollVelocityRef = useRef(0)
  const scrollProgressRef = useRef(0)
  const pulseRef = useRef(0)
  const orbitAngleRef = useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY
      scrollVelocityRef.current = currentScroll - lastScrollRef.current
      lastScrollRef.current = currentScroll
      
      // Calculate scroll progress (0 = top, 1 = bottom)
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      scrollProgressRef.current = maxScroll > 0 ? currentScroll / maxScroll : 0
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useFrame((_, delta) => {
    const velocity = scrollVelocityRef.current
    const isScrolling = Math.abs(velocity) > 0.1

    scrollVelocityRef.current *= 0.92

    if (isScrolling) {
      pulseRef.current += Math.abs(velocity) * 0.015
      // Tiny scroll influence on orbit
      orbitAngleRef.current += velocity * 0.0005
    } else {
      pulseRef.current += 0.02
    }
    
    // Constant orbit movement (independent of scroll) - reduced speed
    // using delta for frame-rate independence (approx 0.1 radians per second)
    orbitAngleRef.current += delta * 0.1
    
    // Rotate scene based on scroll progress for top-down view at bottom
    if (groupRef.current) {
      // Rotate from default (0) to partial top-down view (-Math.PI/3) as user scrolls
      const targetRotationX = -scrollProgressRef.current * (Math.PI / 3)
      // Smooth interpolation for fluid rotation
      groupRef.current.rotation.x += (targetRotationX - groupRef.current.rotation.x) * 0.08
    }
  })

  const allOrbitingSystems = useMemo(() => {
    return EXOPLANET_SYSTEMS.map((system, index) => ({
      system,
      scale: 0.55 + (index % 3) * 0.1,
      orbitRadius: 28 + index * 4,
      orbitSpeed: 0.5 + (index % 4) * 0.08,
    }))
  }, [])

  const orbitingSystems = allOrbitingSystems
  const systemCount = orbitingSystems.length

  const orbitingSystemsWithAngles = orbitingSystems.map((config, index) => ({
    ...config,
    angleOffset: (index / systemCount) * Math.PI * 2,
  }))

  return (
    <group ref={groupRef}>
      <SolarSystemInstance
        systemData={OUR_SOLAR_SYSTEM}
        scale={1}
        scrollVelocityRef={scrollVelocityRef}
        pulseRef={pulseRef}
        isMobile={isMobile}
      />

      {orbitingSystemsWithAngles.map((config) => (
        <SolarSystemInstance
          key={config.system.name}
          systemData={config.system}
          scale={config.scale}
          scrollVelocityRef={scrollVelocityRef}
          pulseRef={pulseRef}
          orbitAngleRef={orbitAngleRef}
          orbitRadius={config.orbitRadius}
          orbitSpeed={config.orbitSpeed}
          angleOffset={config.angleOffset}
          isMobile={isMobile}
        />
      ))}
    </group>
  )
}
