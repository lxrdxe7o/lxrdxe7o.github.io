import { Link } from '@tanstack/react-router'

export default function HomeContent() {
  return (
    <div className="page-content">
      <section className="hero-section">
        <div className="hero-tag">Full-Stack Developer</div>
        <h1 className="hero-title">
          Hi, I'm <span className="gradient-text">Ishraful Haque</span>
        </h1>
        <p className="hero-description">
          Building modern, performant, and scalable applications with a passion
          for clean code and innovative solutions.
        </p>
        <div className="hero-cta">
          <Link to="/projects" className="cta-primary">View Projects</Link>
          <Link to="/contact" className="cta-secondary">Get in Touch</Link>
        </div>
      </section>
    </div>
  )
}