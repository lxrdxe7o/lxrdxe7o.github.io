import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useIsMobile } from '@/hooks/useIsMobile'

// Matrix rain character columns
const MATRIX_CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF<>{}[]=/\\'

interface MatrixColumn {
  x: number
  y: number
  speed: number
  chars: string[]
  opacity: number
}

interface DataBlock {
  position: [number, number, number]
  size: number
  rotationSpeed: [number, number, number]
  color: string
}

// Matrix Rain Effect Component
function MatrixRain({ numCols = 60 }: { numCols?: number }) {
  const groupRef = useRef<THREE.Group>(null)
  const columnsRef = useRef<MatrixColumn[]>([])

  const columns = useMemo(() => {
    const cols: MatrixColumn[] = []
    const spacing = 0.5

    for (let i = 0; i < numCols; i++) {
      const numChars = Math.floor(Math.random() * 10) + 5
      const chars: string[] = []
      for (let j = 0; j < numChars; j++) {
        chars.push(MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)])
      }

      cols.push({
        x: (i - numCols / 2) * spacing,
        y: Math.random() * 20 - 10,
        speed: Math.random() * 0.05 + 0.02,
        chars,
        opacity: Math.random() * 0.5 + 0.3
      })
    }
    columnsRef.current = cols
    return cols
  }, [numCols])

  useFrame((_, delta) => {
    columnsRef.current.forEach((col) => {
      col.y -= col.speed * delta * 60
      if (col.y < -15) {
        col.y = 15
        // Regenerate characters
        for (let i = 0; i < col.chars.length; i++) {
          col.chars[i] = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]
        }
      }
    })
  })

  return (
    <group ref={groupRef} position={[0, 0, -8]}>
      {columns.map((col, i) => (
        <group key={i} position={[col.x, col.y, 0]}>
          {col.chars.map((char, j) => (
            <Text
              key={j}
              position={[0, -j * 0.35, 0]}
              fontSize={0.25}
              color={j === 0 ? '#8b5cf6' : `rgba(99, 102, 241, ${col.opacity - j * 0.05})`}
              font="https://fonts.gstatic.com/s/spacemono/v12/i7dPIFZifjKcF5UAWdDRYEF8RQ.woff"
              anchorX="center"
              anchorY="middle"
            >
              {char}
            </Text>
          ))}
        </group>
      ))}
    </group>
  )
}

// Floating Data Cubes
function DataCube({ position, size, rotationSpeed, color }: DataBlock) {
  const meshRef = useRef<THREE.Mesh>(null)
  const floatOffset = useMemo(() => Math.random() * Math.PI * 2, [])

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += rotationSpeed[0]
      meshRef.current.rotation.y += rotationSpeed[1]
      meshRef.current.rotation.z += rotationSpeed[2]
      meshRef.current.position.y = position[1] + Math.sin(clock.elapsedTime + floatOffset) * 0.3
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[size, size, size]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.3}
        transparent
        opacity={0.7}
        wireframe={false}
      />
    </mesh>
  )
}

// Wireframe cube overlay
function WireframeCube({ position, size, rotationSpeed }: DataBlock) {
  const meshRef = useRef<THREE.Mesh>(null)
  const floatOffset = useMemo(() => Math.random() * Math.PI * 2, [])

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += rotationSpeed[0]
      meshRef.current.rotation.y += rotationSpeed[1]
      meshRef.current.position.y = position[1] + Math.sin(clock.elapsedTime + floatOffset) * 0.3
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[size * 1.1, size * 1.1, size * 1.1]} />
      <meshBasicMaterial color="#6366f1" wireframe transparent opacity={0.4} />
    </mesh>
  )
}

// Connection Lines between nodes
function ConnectionLines() {
  const linesRef = useRef<THREE.LineSegments>(null)

  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = []
    const nodePositions = [
      [-3, 1, -2],
      [3, 2, -3],
      [0, 3, -4],
      [-2, -1, -2],
      [2, 0, -3],
      [0, -2, -3],
      [-4, 2, -5],
      [4, -1, -4],
    ]

    nodePositions.forEach((pos1, i) => {
      nodePositions.forEach((pos2, j) => {
        if (i < j) {
          const dist = Math.sqrt(
            Math.pow(pos1[0] - pos2[0], 2) +
            Math.pow(pos1[1] - pos2[1], 2) +
            Math.pow(pos1[2] - pos2[2], 2)
          )
          if (dist < 5) {
            points.push(
              new THREE.Vector3(pos1[0], pos1[1], pos1[2]),
              new THREE.Vector3(pos2[0], pos2[1], pos2[2])
            )
          }
        }
      })
    })

    const geo = new THREE.BufferGeometry().setFromPoints(points)
    return geo
  }, [])

  useFrame(({ clock }) => {
    if (linesRef.current) {
      const material = linesRef.current.material as THREE.LineBasicMaterial
      material.opacity = 0.3 + Math.sin(clock.elapsedTime * 2) * 0.2
    }
  })

  return (
    <lineSegments ref={linesRef} geometry={geometry}>
      <lineBasicMaterial color="#8b5cf6" transparent opacity={0.4} />
    </lineSegments>
  )
}

// Grid Floor with Perspective
function GridFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
      <planeGeometry args={[50, 50, 50, 50]} />
      <meshBasicMaterial
        color="#6366f1"
        wireframe
        transparent
        opacity={0.15}
      />
    </mesh>
  )
}

// Node points at connection intersections
function NetworkNodes() {
  const nodesRef = useRef<THREE.Points>(null)

  const geometry = useMemo(() => {
    const positions: number[] = []
    const colors: number[] = []

    const nodePositions = [
      [-3, 1, -2],
      [3, 2, -3],
      [0, 3, -4],
      [-2, -1, -2],
      [2, 0, -3],
      [0, -2, -3],
      [-4, 2, -5],
      [4, -1, -4],
    ]

    const color = new THREE.Color('#6366f1')

    nodePositions.forEach((pos) => {
      positions.push(pos[0], pos[1], pos[2])
      colors.push(color.r, color.g, color.b)
    })

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    return geo
  }, [])

  useFrame(({ clock }) => {
    if (nodesRef.current) {
      nodesRef.current.rotation.y = clock.elapsedTime * 0.05
    }
  })

  return (
    <points ref={nodesRef} geometry={geometry}>
      <pointsMaterial size={0.15} vertexColors transparent opacity={0.8} />
    </points>
  )
}

// Main data blocks
function DataBlocks() {
  const blocks: DataBlock[] = useMemo(() => [
    { position: [-3, 1, -2], size: 0.4, rotationSpeed: [0.01, 0.02, 0.005], color: '#6366f1' },
    { position: [3, 2, -3], size: 0.5, rotationSpeed: [0.015, 0.01, 0.02], color: '#8b5cf6' },
    { position: [0, 3, -4], size: 0.35, rotationSpeed: [0.02, 0.015, 0.01], color: '#6366f1' },
    { position: [-2, -1, -2], size: 0.45, rotationSpeed: [0.01, 0.02, 0.015], color: '#8b5cf6' },
    { position: [2, 0, -3], size: 0.3, rotationSpeed: [0.025, 0.01, 0.02], color: '#6366f1' },
    { position: [0, -2, -3], size: 0.4, rotationSpeed: [0.01, 0.025, 0.01], color: '#8b5cf6' },
    { position: [-4, 2, -5], size: 0.5, rotationSpeed: [0.015, 0.02, 0.01], color: '#6366f1' },
    { position: [4, -1, -4], size: 0.35, rotationSpeed: [0.02, 0.01, 0.025], color: '#8b5cf6' },
  ], [])

  return (
    <>
      {blocks.map((block, i) => (
        <group key={i}>
          <DataCube {...block} />
          <WireframeCube {...block} />
        </group>
      ))}
    </>
  )
}

// Main Scene Component
function Scene() {
  const isMobile = useIsMobile()

  return (
    <>
      <color attach="background" args={['#0a0a1a']} />
      <fog attach="fog" args={['#0a0a1a', 5, 25]} />

      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={0.5} color="#6366f1" />
      <pointLight position={[-10, -10, -10]} intensity={0.3} color="#8b5cf6" />

      <MatrixRain numCols={isMobile ? 20 : 60} />
      <DataBlocks />
      <ConnectionLines />
      <NetworkNodes />
      <GridFloor />
      
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.5}
        maxPolarAngle={Math.PI / 1.8}
        minPolarAngle={Math.PI / 3}
      />
    </>
  )
}

// Export the scene body directly (Canvas is provided by SceneEngine)
export default function DigitalMatrixScene() {
  return <Scene />
}
