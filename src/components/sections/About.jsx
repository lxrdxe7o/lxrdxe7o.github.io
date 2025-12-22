import { motion } from 'framer-motion';
import { profile } from '../../data/profile';
import styles from './About.module.css';

export function About() {
  return (
    <motion.section 
      id="about" 
      className={styles.section}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6 }}
    >
      <h2 className={styles.title}>
        <span className={styles.icon}>👤</span> About Me
      </h2>
      
      <div className={styles.content}>
        {profile.about.paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
        
        <div className={styles.stats}>
          {profile.about.stats.map((stat, index) => (
            <motion.div 
              key={index}
              className={styles.statCard}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <span className={styles.statNumber}>{stat.number}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
