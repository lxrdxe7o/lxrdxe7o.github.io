import React, { useState, useEffect, CSSProperties } from 'react'
import './BackgroundScene.css'

export interface BackgroundSceneProps {
  /** Number of animated light beams */
  beamCount?: number
}

const BACKGROUND_BEAM_COUNT = 120

const BackgroundScene: React.FC<BackgroundSceneProps> = ({
  beamCount = BACKGROUND_BEAM_COUNT,
}) => {
  const [beams, setBeams] = useState<
    Array<{ id: number; style: CSSProperties; className: string }>
  >([])
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 })

  // Track mouse coordinates for interactive spotlight glow
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useEffect(() => {
    const generated = Array.from({ length: beamCount }).map((_, i) => {
      const riseDur = Math.random() * 3 + 4    // 4–7s rise
      const fadeDur = riseDur                  // sync fade
      const dropDur = Math.random() * 4 + 3    // 3–7s drop

      const depthVal = Math.random()
      let depthClass = 'mid'
      let blur = '0px'
      let opacity = 0.7
      let scale = 1

      if (depthVal < 0.25) {
        depthClass = 'fore'
        blur = '4px'
        opacity = 0.45
        scale = 1.6
      } else if (depthVal > 0.75) {
        depthClass = 'back'
        blur = '1px'
        opacity = 0.35
        scale = 0.6
      }

      const typeVal = Math.random()
      let typeClass = 'solid'
      if (typeVal < 0.3) {
        typeClass = 'dashed'
      } else if (typeVal < 0.6) {
        typeClass = 'pulse'
      }

      return {
        id: i,
        className: `light-beam beam-${depthClass} beam-${typeClass}`,
        style: {
          left: `${Math.random() * 100}%`,
          width: `${(Math.floor(Math.random() * 3) + 1) * scale}px`,
          filter: blur !== '0px' ? `blur(${blur})` : undefined,
          opacity: opacity,
          animationDelay: `${Math.random() * 6}s`,
          animationDuration: `${riseDur}s, ${fadeDur}s, ${dropDur}s`,
          transform: `scaleY(${scale})`,
        },
      }
    })
    setBeams(generated)
  }, [beamCount])

  return (
    <div className="scene" role="img" aria-label="Animated digital data background">
      {/* Futuristic grid mesh overlay */}
      <div className="grid-overlay" />
      
      {/* Scanline overlay for cyber texture */}
      <div className="scanlines" />
      
      {/* Interactive cursor-following spotlight glow */}
      <div 
        className="interactive-glow" 
        style={{
          background: `radial-gradient(circle 450px at ${mousePos.x}% ${mousePos.y}%, rgba(249, 115, 22, 0.12), transparent 80%)`
        } as CSSProperties}
      />

      {/* Grid Floor with scrolling perspective */}
      <div className="floor" />
      
      {/* Multi-layered central glowing pillar */}
      <div className="main-column-outer" />
      <div className="main-column" />
      
      {/* Fading and rising depth-layered data light streams */}
      <div className="light-stream-container">
        {beams.map((beam) => (
          <div key={beam.id} className={beam.className} style={beam.style} />
        ))}
      </div>

      {/* Decorative structural elements (cyber borders) */}
      <div className="cyber-border top" />
      <div className="cyber-border bottom" />
    </div>
  )
}

export default BackgroundScene
