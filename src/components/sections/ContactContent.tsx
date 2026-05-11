import SectionHeader from '@/components/shared/SectionHeader'
import GlassCard from '@/components/shared/GlassCard'
import { motion } from 'framer-motion'

const socialLinks = [
  { name: 'Email', value: 'ishrak7106@gmail.com', href: 'mailto:ishrak7106@gmail.com', icon: '✉' },
  { name: 'GitHub', value: 'github.com/lxrdxe7o', href: 'https://github.com/lxrdxe7o', icon: '⌥' },
  { name: 'LinkedIn', value: 'linkedin.com/in/ixrdxe7o', href: 'https://linkedin.com/in/ixrdxe7o', icon: '⬡' },
  { name: 'Twitter', value: 'twitter.com/lxrdxe7o', href: 'https://twitter.com/lxrdxe7o', icon: '𝕏' },
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

export default function ContactContent() {
  return (
    <div className="page-content">
      <SectionHeader tag="Get In Touch" title="Let's Connect" icon="◇" />
      <motion.div 
        className="contact-section"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.p variants={itemVariants} className="contact-intro">
          I'm always open to discussing new projects, creative ideas, or opportunities
          to be part of your vision. Feel free to reach out!
        </motion.p>
        <div className="contact-links">
          {socialLinks.map((link) => (
            <motion.div key={link.name} variants={itemVariants}>
              <GlassCard className="contact-card">
                <span className="contact-icon">{link.icon}</span>
                <div className="contact-info">
                  <span className="contact-name">{link.name}</span>
                  <a href={link.href} target="_blank" rel="noopener noreferrer" className="contact-value">
                    {link.value}
                  </a>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}