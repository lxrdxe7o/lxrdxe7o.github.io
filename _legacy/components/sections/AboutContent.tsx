import './AboutContent.css'

export default function AboutContent() {
  return (
    <div className="about-page-wrapper">
      {/* Minimal Navigation */}
      <nav className="nav-minimal">
        <div className="nav-brand">SD—PROTOCOL 01</div>
        <div className="nav-spacer"></div>
        <div className="nav-status">INVITE ONLY</div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-label">
          <div className="hero-label-line"></div>
          <span className="hero-label-text">Early Access</span>
        </div>
        <div className="hero-title-container">
          <h1 className="hero-title-back">
            SUPER<br className="mobile-break" />DESIGN
          </h1>
          <h1 className="hero-title">
            SUPER<br className="mobile-break" />DESIGN
          </h1>
        </div>
      </section>

      {/* Bottom Grid Section */}
      <section className="bottom-section">
        <div className="divider"></div>
        
        <div className="grid-container">
          <div className="exclusivity-col">
            <p className="exclusivity-text">
              A minimalist, editorial-inspired platform designed to convey quiet confidence and exclusivity. Built for those who value typographic impact and structured grid alignment over generic elements.
            </p>
            <div className="status-indicator">
              <div className="status-dot"></div>
              <span className="status-text">Batch 003 Filling</span>
            </div>
          </div>
          
          <div className="form-col">
            <form className="email-form" onSubmit={(e) => e.preventDefault()}>
              <input 
                type="email" 
                className="email-input" 
                placeholder="Enter email address" 
                required 
              />
              <button type="submit" className="email-button">Submit</button>
            </form>
            <span className="form-caption">Zero spam. Pure utility.</span>
          </div>
        </div>
      </section>

      {/* Rotating Waitlist Badge */}
      <div className="rotating-badge">
        <svg className="badge-text-svg" viewBox="0 0 100 100">
          <path 
            id="circlePath" 
            d="M 50, 50 m -35, 0 a 35,35 0 1,1 70,0 a 35,35 0 1,1 -70,0" 
            fill="none" 
          />
          <text>
            <textPath href="#circlePath" startOffset="0" className="badge-text-path">
              WAITING LIST • WAITING LIST • 
            </textPath>
          </text>
        </svg>
      </div>
    </div>
  )
}