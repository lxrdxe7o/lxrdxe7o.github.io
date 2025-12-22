import { motion } from 'framer-motion';
import { profile } from '../../data/profile';
import styles from './Contact.module.css';

export function Contact() {
  return (
    <motion.section 
      id="contact" 
      className={styles.section}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6 }}
    >
      <h2 className={styles.title}>
        <span className={styles.icon}>📬</span> Get in Touch
      </h2>
      
      <div className={styles.content}>
        <p className={styles.intro}>
          Interested in collaborating or have a question? Feel free to reach out!
        </p>
        
        <div className={styles.links}>
          <motion.a 
            href={profile.github}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.card}
            whileHover={{ y: -5 }}
          >
            <span className={styles.cardIcon}>🐙</span>
            <span className={styles.cardLabel}>GitHub</span>
            <span className={styles.cardValue}>{profile.githubUsername}</span>
          </motion.a>
        </div>
      </div>
    </motion.section>
  );
}
