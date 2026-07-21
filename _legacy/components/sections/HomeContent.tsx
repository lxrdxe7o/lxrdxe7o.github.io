import { Link } from '@tanstack/react-router'
import styles from './HomeContent.module.css'
import { ShaderAnimation } from '@/components/three/ShaderAnimation'

export default function HomeContent() {
  return (
    <div className={styles.container}>
      <ShaderAnimation />
      <div className={styles.textCenter}>
        <div className={`${styles.statusBadge} ${styles.animateFadeUp} ${styles.delay1}`}>
          <span className={styles.pingWrapper}>
            <span className={styles.pingDot}></span>
            <span className={styles.innerDot}></span>
          </span>
          <span className={styles.statusText}>
            Available for new opportunities
          </span>
        </div>

        <h1 className={`${styles.title} ${styles.animateFadeUp} ${styles.delay2}`}>
          <span className={styles.gradientText}>Full-Stack Developer</span>
          <span className={styles.gradientText}>
            Building the <span className={styles.accentText}>
              Future
              <svg className={styles.underlineSvg} viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            </span>
          </span>
        </h1>

        <p className={`${styles.description} ${styles.animateFadeUp} ${styles.delay3}`}>
          Hi, I'm Ishraful Haque. I build modern, performant, and scalable applications with a passion for clean code.
        </p>

        <div className={`${styles.ctaGroup} ${styles.animateFadeUp} ${styles.delay4}`}>
          <Link to="/projects" className={styles.shinyCta}>
            <span style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              View Projects 
              <span className={styles.arrowIcon}>→</span>
            </span>
          </Link>
          
          <Link to="/contact" className={styles.secondaryCta}>
            Get in Touch
          </Link>
        </div>
      </div>
    </div>
  )
}