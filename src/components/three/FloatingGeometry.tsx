import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'

interface FloatingShapeProps {
  position: [number, number, number]
  scale: number
  color: string
  speed: number
  distort: number
  geometry: 'icosahedron' | 'octahedron' | 'dodecahedron'
}

function FloatingShape({ position, scale, color, speed, distort, geometry }: FloatingShapeProps) {
  const mesh = useRef<THREE.Mesh>(null!)
  const initialY = position[1]

  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    mesh.current.rotation.x = time * speed * 0.5
    mesh.current.rotation.y = time * speed * 0.3
    mesh.current.position.y = initialY + Math.sin(time * speed) * 0.5
    mesh.current.position.x = position[0] + Math.cos(time * speed * 0.5) * 0.3
  })

  const GeometryComponent = () => {
    switch (geometry) {
      case 'icosahedron':
        return <icosahedronGeometry args={[1, 1]} />
      case 'octahedron':
        return <octahedronGeometry args={[1, 0]} />
      case 'dodecahedron':
        return <dodecahedronGeometry args={[1, 0]} />
    }
  }

  return (
    <mesh ref={mesh} position={position} scale={scale}>
      <GeometryComponent />
      <MeshDistortMaterial
        color={color}
        distort={distort}
        speed={2}
        roughness={0.2}
        metalness={0.8}
      />
    </mesh>
  )
}

export default function FloatingGeometry() {
  const shapes = [
    { position: [-8, 3, -5] as [number, number, number], scale: 1.2, color: '#a855f7', speed: 0.4, distort: 0.4, geometry: 'icosahedron' as const },
    { position: [7, -2, -8] as [number, number, number], scale: 0.8, color: '#6366f1', speed: 0.3, distort: 0.3, geometry: 'octahedron' as const },
    { position: [-5, -4, -3] as [number, number, number], scale: 0.6, color: '#ec4899', speed: 0.5, distort: 0.5, geometry: 'dodecahedron' as const },
    { position: [6, 4, -6] as [number, number, number], scale: 1.0, color: '#c084fc', speed: 0.35, distort: 0.35, geometry: 'icosahedron' as const },
    { position: [0, -5, -10] as [number, number, number], scale: 1.5, color: '#8b5cf6', speed: 0.25, distort: 0.2, geometry: 'dodecahedron' as const },
    { position: [-10, 0, -12] as [number, number, number], scale: 0.9, color: '#a78bfa', speed: 0.45, distort: 0.45, geometry: 'octahedron' as const },
  ]

  return (
    <group>
      {shapes.map((shape, i) => (
        <FloatingShape key={i} {...shape} />
      ))}
    </group>
  )
}
