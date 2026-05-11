import { Link } from '@tanstack/react-router'
import { navLinks } from './navLinks'
import { LightBeamButton } from '@/components/shared/LightBeamButton'

export default function Navbar({ onMenuToggle }: { onMenuToggle: () => void }) {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">
          <span className="logo-text">Ishraful Haque</span>
        </Link>

        <ul className="nav-links">
          {navLinks.map((link) => (
            <li key={link.to}>
              {link.to.startsWith('http') ? (
                <a
                  href={link.to}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-link"
                >
                  <span className="nav-icon">{link.icon}</span>
                  <span className="nav-label">{link.label}</span>
                </a>
              ) : (
                <Link
                  to={link.to}
                  className="nav-link"
                  activeProps={{ className: 'nav-link active' }}
                >
                  <span className="nav-icon">{link.icon}</span>
                  <span className="nav-label">{link.label}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>

        <LightBeamButton
          className="mobile-menu-toggle"
          onClick={onMenuToggle}
          aria-label="Toggle mobile menu"
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </LightBeamButton>
      </div>
    </nav>
  )
}
