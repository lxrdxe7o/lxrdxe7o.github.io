import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import Atom from './Atom'

export default function Scene3D() {
  return (
    <div className="scene-container">
      <Canvas
        camera={{ position: [0, 0, 20], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <pointLight position={[10, 10, 10]} intensity={1.5} color="#a855f7" />
          <pointLight position={[-10, -10, -10]} intensity={0.8} color="#6366f1" />
          <pointLight position={[0, 0, 15]} intensity={0.5} color="#c084fc" />
          <Atom />
        </Suspense>
      </Canvas>
    </div>
  )
}
