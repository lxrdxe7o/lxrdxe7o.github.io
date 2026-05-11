import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import Typewriter from '@/components/shared/Typewriter'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.3 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' }
  }
}

export default function HomeContent() {
  return (
    <div className="page-content">
      <motion.section 
        className="hero-section"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="hero-tag">
          Full-Stack Developer
        </motion.div>
        
        <motion.h1 variants={itemVariants} className="hero-title">
          Hi, I'm <Typewriter text="Ishraful Haque" className="gradient-text" delay={0.5} />
        </motion.h1>
        
        <motion.p variants={itemVariants} className="hero-description">
          Building modern, performant, and scalable applications with a passion
          for clean code and innovative solutions.
        </motion.p>
        
        <motion.div variants={itemVariants} className="hero-cta">
          <Link to="/projects" className="cta-primary">View Projects</Link>
          <Link to="/contact" className="cta-secondary">Get in Touch</Link>
        </motion.div>
      </motion.section>
    </div>
  )
}