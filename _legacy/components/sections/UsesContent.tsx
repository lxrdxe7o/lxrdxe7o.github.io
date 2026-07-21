import SectionHeader from '@/components/shared/SectionHeader'
import GlassCard from '@/components/shared/GlassCard'
import { motion } from 'framer-motion'

const uses = [
  {
    category: 'Hardware',
    items: [
      { name: 'MacBook Pro M3', description: '16GB RAM, primary work machine' },
      { name: 'LG 27" 4K Monitor', description: 'External display for productivity' },
      { name: 'Keychron Q1 Pro', description: 'Mechanical keyboard with Gateron switches' },
    ],
  },
  {
    category: 'Software',
    items: [
      { name: 'Neovim', description: 'Primary editor with custom configuration' },
      { name: 'VS Code', description: 'For collaboration and debugging' },
      { name: 'Alacritty', description: 'GPU-accelerated terminal emulator' },
      { name: 'Arc Browser', description: 'Daily driver for web browsing' },
    ],
  },
  {
    category: 'Services',
    items: [
      { name: 'GitHub', description: 'Version control and collaboration' },
      { name: 'Vercel', description: 'Frontend deployments and blog hosting' },
      { name: 'Cloudflare', description: 'DNS and CDN management' },
    ],
  },
  {
    category: 'Workflow',
    items: [
      { name: 'Zsh + Starship', description: 'Shell with minimal prompt' },
      { name: 'Tmux', description: 'Terminal multiplexing' },
      { name: 'Obsidian', description: 'Note-taking and knowledge management' },
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

export default function UsesContent() {
  return (
    <div className="page-content">
      <SectionHeader tag="My Setup" title="What I Use" icon="⬡" />
      <motion.div 
        className="uses-grid"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {uses.map((cat) => (
          <motion.div key={cat.category} variants={itemVariants} className="uses-category">
            <h3 className="uses-category-title">{cat.category}</h3>
            <div className="uses-items">
              {cat.items.map((item) => (
                <GlassCard key={item.name} className="use-item">
                  <h4 className="use-name">{item.name}</h4>
                  <p className="use-description">{item.description}</p>
                </GlassCard>
              ))}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}