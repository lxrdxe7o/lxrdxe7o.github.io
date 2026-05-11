import SectionHeader from '@/components/shared/SectionHeader'
import GlassCard from '@/components/shared/GlassCard'

const socialLinks = [
  { name: 'Email', value: 'ishrak7106@gmail.com', href: 'mailto:ishrak7106@gmail.com', icon: '✉' },
  { name: 'GitHub', value: 'github.com/lxrdxe7o', href: 'https://github.com/lxrdxe7o', icon: '⌥' },
  { name: 'LinkedIn', value: 'linkedin.com/in/ixrdxe7o', href: 'https://linkedin.com/in/ixrdxe7o', icon: '⬡' },
]

export default function ContactContent() {
  return (
    <div className="page-content">
      <SectionHeader tag="Get In Touch" title="Let's Connect" icon="◇" />
      <div className="contact-section">
        <p className="contact-intro">
          I'm always open to discussing new projects, creative ideas, or opportunities
          to be part of your vision. Feel free to reach out!
        </p>
        <div className="contact-links">
          {socialLinks.map((link) => (
            <GlassCard key={link.name} className="contact-card">
              <span className="contact-icon">{link.icon}</span>
              <div className="contact-info">
                <span className="contact-name">{link.name}</span>
                <a href={link.href} target="_blank" rel="noopener noreferrer" className="contact-value">
                  {link.value}
                </a>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  )
}