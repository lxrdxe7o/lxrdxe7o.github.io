import SectionHeader from '@/components/shared/SectionHeader'
import GlassCard from '@/components/shared/GlassCard'
import { LightBeamButton } from '@/components/shared/LightBeamButton'
import { motion } from 'framer-motion'

const projects = [
  {
    title: 'KrakenVim',
    description: 'A highly customizable Neovim configuration framework with LSP support, fuzzy finding, and a focus on productive workflows.',
    tech: ['Lua', 'Neovim', 'LSP'],
    link: 'https://github.com/lxrdxe7o/krakenvim',
  },
  {
    title: 'dotfiles',
    description: 'My personal dotfiles repository — automated, modular, and extensible configuration management for Linux and macOS.',
    tech: ['Bash', 'Zsh', 'Git'],
    link: 'https://github.com/lxrdxe7o/dotfiles',
  },
  {
    title: 'xero-shell',
    description: 'A feature-rich bash framework providing utilities, theming, and plugin management for terminal workflows.',
    tech: ['Bash', 'Shell', 'Terminal'],
    link: 'https://github.com/lxrdxe7o/xero-shell',
  },
  {
    title: 'DeadDrop',
    description: 'A secure, anonymous message-sharing service with end-to-end encryption and self-destructing notes.',
    tech: ['TypeScript', 'React', 'Node.js'],
    link: 'https://github.com/lxrdxe7o/deaddrop',
  },
  {
    title: 'hachi',
    description: 'A lightweight HTTP server library in Rust with async support, routing, and middleware composition.',
    tech: ['Rust', 'Async', 'HTTP'],
    link: 'https://github.com/lxrdxe7o/hachi',
  },
  {
    title: 'mikeneko',
    description: 'A modern IRC client built with Rust and a terminal-native TUI, featuring async communication and plugin support.',
    tech: ['Rust', 'TUI', 'IRC'],
    link: 'https://github.com/lxrdxe7o/mikeneko',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' }
  }
}

export default function ProjectsContent() {
  return (
    <div className="page-content">
      <SectionHeader tag="My Work" title="Featured Projects" icon="⚙" />
      <motion.div 
        className="projects-grid"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {projects.map((project) => (
          <motion.div key={project.title} variants={itemVariants}>
            <GlassCard className="project-card">
              <h3 className="project-title">{project.title}</h3>
              <p className="project-description">{project.description}</p>
              <div className="project-tech">
                {project.tech.map(t => (
                  <span key={t} className="tech-tag">{t}</span>
                ))}
              </div>
              <LightBeamButton href={project.link} target="_blank" rel="noopener noreferrer" className="project-link">
                View on GitHub →
              </LightBeamButton>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}