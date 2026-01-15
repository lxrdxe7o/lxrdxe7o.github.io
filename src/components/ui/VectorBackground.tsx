
import { motion, useScroll, useTransform } from 'framer-motion';
import styles from './VectorBackground.module.css';

export function VectorBackground() {
  const { scrollYProgress } = useScroll();
  
  // Rotations based on scroll
  const rotate1 = useTransform(scrollYProgress, [0, 1], [0, 360]);
  const rotate3 = useTransform(scrollYProgress, [0, 1], [0, -180]);
  
  // Translations based on scroll
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 100]);

  return (
    <div className={styles.container}>
      {/* Large Gear - Top Right */}
      <motion.div 
        className={styles.gearLarge}
        style={{ rotate: rotate1, y: y1 }}
      >
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M50 0L55 10L65 12L75 5L85 15L78 25L85 35L95 35L100 45L90 55L95 65L100 75L90 85L80 80L70 85L65 95L55 100L45 90L35 95L25 100L15 90L20 80L10 75L0 65L10 55L5 45L0 35L10 25L5 15L15 5L25 12L35 10L40 0H50Z" 
                stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.1" />
          <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.1" />
          <circle cx="50" cy="50" r="15" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.1" />
        </svg>
      </motion.div>

      {/* Circuit Board - Center Left */}
      <motion.div 
        className={styles.circuit}
        style={{ y: y2 }}
      >
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 20 H50 L70 40 H120 L140 20 H180" stroke="currentColor" strokeWidth="1" strokeOpacity="0.1" />
          <circle cx="20" cy="20" r="3" fill="currentColor" fillOpacity="0.1" />
          <circle cx="180" cy="20" r="3" fill="currentColor" fillOpacity="0.1" />
          
          <path d="M20 60 H80 L100 80 H160" stroke="currentColor" strokeWidth="1" strokeOpacity="0.1" />
          <circle cx="20" cy="60" r="3" fill="currentColor" fillOpacity="0.1" />
          <circle cx="160" cy="80" r="3" fill="currentColor" fillOpacity="0.1" />
          
          <path d="M40 100 H90 L110 120 H150" stroke="currentColor" strokeWidth="1" strokeOpacity="0.1" />
          <circle cx="40" cy="100" r="3" fill="currentColor" fillOpacity="0.1" />
          <circle cx="150" cy="120" r="3" fill="currentColor" fillOpacity="0.1" />
          
          <path d="M20 160 H60 L80 140 H180" stroke="currentColor" strokeWidth="1" strokeOpacity="0.1" />
          <circle cx="20" cy="160" r="3" fill="currentColor" fillOpacity="0.1" />
          <circle cx="180" cy="140" r="3" fill="currentColor" fillOpacity="0.1" />
        </svg>
      </motion.div>

      {/* Decorative Hexagons - Bottom Right */}
      <motion.div 
        className={styles.hexagons}
        style={{ rotate: rotate3, y: y1 }}
      >
         <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M50 0 L93.3 25 V75 L50 100 L6.7 75 V25 L50 0Z" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.05" />
          <path d="M50 20 L75 35 V65 L50 80 L25 65 V35 L50 20Z" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.1" />
          <path d="M50 35 L60 41 V59 L50 65 L40 59 V41 L50 35Z" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.15" />
         </svg>
      </motion.div>
    </div>
  );
}
