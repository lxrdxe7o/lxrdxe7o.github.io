import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function AnimatedTorus() {
  const torusRef = useRef<THREE.Mesh>(null!)
  const torus2Ref = useRef<THREE.Mesh>(null!)
  const torus3Ref = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    const scrollY = window.scrollY * 0.001

    if (torusRef.current) {
      torusRef.current.rotation.x = time * 0.2 + scrollY
      torusRef.current.rotation.y = time * 0.1
    }

    if (torus2Ref.current) {
      torus2Ref.current.rotation.x = -time * 0.15
      torus2Ref.current.rotation.z = time * 0.2 + scrollY * 0.5
    }

    if (torus3Ref.current) {
      torus3Ref.current.rotation.y = time * 0.25 + scrollY * 0.3
      torus3Ref.current.rotation.z = -time * 0.1
    }
  })

  return (
    <group position={[0, 0, -5]}>
      <mesh ref={torusRef}>
        <torusGeometry args={[4, 0.02, 16, 100]} />
        <meshStandardMaterial
          color="#a855f7"
          emissive="#a855f7"
          emissiveIntensity={0.5}
          transparent
          opacity={0.6}
        />
      </mesh>

      <mesh ref={torus2Ref} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[5, 0.015, 16, 100]} />
        <meshStandardMaterial
          color="#6366f1"
          emissive="#6366f1"
          emissiveIntensity={0.5}
          transparent
          opacity={0.5}
        />
      </mesh>

      <mesh ref={torus3Ref} rotation={[0, Math.PI / 4, Math.PI / 6]}>
        <torusGeometry args={[6, 0.01, 16, 100]} />
        <meshStandardMaterial
          color="#ec4899"
          emissive="#ec4899"
          emissiveIntensity={0.5}
          transparent
          opacity={0.4}
        />
      </mesh>
    </group>
  )
}
