import { Link } from '@tanstack/react-router'
import { navLinks } from './navLinks'
import { LightBeamButton } from '@/components/shared/LightBeamButton'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  route?: string // Keep it optional if needed elsewhere, but don't force usage here
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  if (!isOpen) return null

  return (
    <div className="mobile-menu-overlay" onClick={onClose}>
      <div className="mobile-menu-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="mobile-menu-header">
          <span className="mobile-menu-title">Navigation</span>
          <LightBeamButton className="mobile-menu-close" onClick={onClose} aria-label="Close menu">
            ✕
          </LightBeamButton>
        </div>
        <nav className="mobile-nav">
          {navLinks.map((link) => (
            <div key={link.to} className="mobile-nav-item">
              {link.to.startsWith('http') ? (
                <a
                  href={link.to}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mobile-nav-link"
                  onClick={onClose}
                >
                  <span className="mobile-nav-icon">{link.icon}</span>
                  <span>{link.label}</span>
                </a>
              ) : (
                <Link
                  to={link.to}
                  className="mobile-nav-link"
                  activeProps={{ className: 'mobile-nav-link active' }}
                  onClick={onClose}
                >
                  <span className="mobile-nav-icon">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>
    </div>
  )
}
