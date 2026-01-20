import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

const hiText = "Hi, I'm "
const xeroLetters = ['x', 'e', 'r', 'o']
const description = "Building modern, performant, and scalable applications with a passion for clean code and innovative solutions."

const TYPING_SPEED = 50
const XERO_DELAY = 80
const DESCRIPTION_DELAY = 40

export default function Hero() {
  const [hiDisplayed, setHiDisplayed] = useState('')
  const [xeroDisplayed, setXeroDisplayed] = useState<string[]>([])
  const [descDisplayed, setDescDisplayed] = useState('')
  const [phase, setPhase] = useState<'hi' | 'xero' | 'desc' | 'done'>('hi')

  useEffect(() => {
    if (phase === 'hi') {
      if (hiDisplayed.length < hiText.length) {
        const timeout = setTimeout(() => {
          setHiDisplayed(hiText.slice(0, hiDisplayed.length + 1))
        }, TYPING_SPEED)
        return () => clearTimeout(timeout)
      } else {
        setPhase('xero')
      }
    }
  }, [hiDisplayed, phase])

  useEffect(() => {
    if (phase === 'xero') {
      if (xeroDisplayed.length < xeroLetters.length) {
        const timeout = setTimeout(() => {
          setXeroDisplayed(xeroLetters.slice(0, xeroDisplayed.length + 1))
        }, XERO_DELAY)
        return () => clearTimeout(timeout)
      } else {
        const timeout = setTimeout(() => setPhase('desc'), 300)
        return () => clearTimeout(timeout)
      }
    }
  }, [xeroDisplayed, phase])

  useEffect(() => {
    if (phase === 'desc') {
      if (descDisplayed.length < description.length) {
        const timeout = setTimeout(() => {
          setDescDisplayed(description.slice(0, descDisplayed.length + 1))
        }, DESCRIPTION_DELAY)
        return () => clearTimeout(timeout)
      } else {
        setPhase('done')
      }
    }
  }, [descDisplayed, phase])

  return (
    <section className="section hero">
      <motion.div
        className="hero-content"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <motion.span
          className="hero-tag"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Full-Stack Developer
        </motion.span>
        <h1 className="hero-title">
          {hiDisplayed}
          {phase === 'hi' && <span className="typewriter-cursor" />}
          <span className="xero-text">
            {xeroDisplayed.map((letter, i) => (
              <span key={i} className="xero-letter">
                {letter}
              </span>
            ))}
          </span>
          {phase === 'xero' && <span className="typewriter-cursor" />}
        </h1>
        <p className="hero-description">
          {descDisplayed}
          {phase === 'desc' && <span className="typewriter-cursor" />}
        </p>
        <motion.div
          className="hero-buttons"
          initial={{ opacity: 0, y: 20 }}
          animate={phase === 'done' ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
        >
          <a href="#projects" className="btn btn-primary">
            View Projects
          </a>
          <a href="#contact" className="btn btn-secondary">
            Get in Touch
          </a>
        </motion.div>
      </motion.div>
      <motion.div
        className="scroll-indicator"
        initial={{ opacity: 0 }}
        animate={phase === 'done' ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <span>Scroll to explore</span>
        <div className="scroll-arrow" />
      </motion.div>
    </section>
  )
}
