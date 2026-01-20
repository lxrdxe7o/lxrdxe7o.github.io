import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import Atom from './Atom'
import AbyssBackground from './AbyssBackground'

export default function Scene3D() {
  return (
    <div className="scene-container">
      <Canvas
        camera={{ position: [0, 0, 20], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <AbyssBackground />
          <ambientLight intensity={0.3} color="#1a0515" />
          <pointLight position={[10, 10, 10]} intensity={1.8} color="#a855f7" />
          <pointLight position={[-10, -10, -10]} intensity={1.0} color="#ec4899" />
          <pointLight position={[0, 0, 15]} intensity={0.6} color="#c084fc" />
          <pointLight position={[-15, 5, 5]} intensity={0.4} color="#7c3aed" />
          <Atom />
        </Suspense>
      </Canvas>
    </div>
  )
}
