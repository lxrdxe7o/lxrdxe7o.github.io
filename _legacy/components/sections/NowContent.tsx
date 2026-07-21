import SectionHeader from '@/components/shared/SectionHeader'
import GlassCard from '@/components/shared/GlassCard'
import { motion } from 'framer-motion'

const nowItems = [
  {
    category: 'Building',
    items: [
      { title: 'This Portfolio', description: 'Full redesign with TanStack suite and unique 3D scenes per page' },
      { title: 'hachi', description: 'HTTP server library in Rust with async support' },
    ],
  },
  {
    category: 'Learning',
    items: [
      { title: 'Rust WASM', description: 'WebAssembly compilation and browser interop' },
      { title: 'System Design', description: 'Distributed systems patterns and architecture' },
    ],
  },
  {
    category: 'Reading',
    items: [
      { title: 'Structure and Interpretation of Computer Programs (SICP)', description: 'Classic CS text on computation and programming' },
      { title: 'The Rust Programming Language', description: 'Deepening Rust knowledge' },
    ],
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' }
  }
}

export default function NowContent() {
  return (
    <div className="page-content">
      <SectionHeader tag="Currently" title="What I'm Working On" icon="⚡" />
      <motion.div 
        className="now-section"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {nowItems.map((section) => (
          <motion.div key={section.category} variants={itemVariants} className="now-category">
            <h3 className="now-category-title">{section.category}</h3>
            <div className="now-items">
              {section.items.map((item) => (
                <GlassCard key={item.title} className="now-item">
                  <h4 className="now-item-title">{item.title}</h4>
                  <p className="now-item-description">{item.description}</p>
                </GlassCard>
              ))}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}