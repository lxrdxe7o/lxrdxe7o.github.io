import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui';
import { profile } from '../../data/profile';
import styles from './Hero.module.css';

export function Hero() {
  const [roleIndex, setRoleIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentRole = profile.roles[roleIndex];
    const speed = isDeleting ? 50 : 100;

    const timeout = setTimeout(() => {
      if (!isDeleting && displayText === currentRole) {
        setTimeout(() => setIsDeleting(true), 2000);
      } else if (isDeleting && displayText === '') {
        setIsDeleting(false);
        setRoleIndex((prev) => (prev + 1) % profile.roles.length);
      } else {
        setDisplayText(
          isDeleting
            ? currentRole.substring(0, displayText.length - 1)
            : currentRole.substring(0, displayText.length + 1)
        );
      }
    }, speed);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, roleIndex]);

  return (
    <section id="hero" className={styles.hero}>
      <div className={`container ${styles.container}`}>
        <motion.div 
          className={styles.content}
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className={styles.badge}>
            <span className={styles.badgeDot}></span>
            Available for projects
          </div>
          
          <h2 className={styles.title}>
            Hi, I'm <span className={styles.accent}>{profile.name}</span>
          </h2>
          
          <p className={styles.tagline}>
            <span className={styles.typingText}>{displayText}</span>
            <span className={styles.cursor}>|</span>
          </p>
          
          <p className={styles.description}>
            {profile.tagline}<br />
            {profile.description}
          </p>
          
          <div className={styles.cta}>
            <Button href="#projects" icon="🚀">
              View Projects
            </Button>
            <Button href={profile.github} variant="secondary" icon="⚡" external>
              GitHub
            </Button>
          </div>
        </motion.div>

        <motion.div 
          className={styles.visual}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className={styles.codeWindow}>
            <div className={styles.codeHeader}>
              <span className={`${styles.dot} ${styles.red}`}></span>
              <span className={`${styles.dot} ${styles.yellow}`}></span>
              <span className={`${styles.dot} ${styles.green}`}></span>
              <span className={styles.codeTitle}>{profile.codePreview.title}</span>
            </div>
            <pre className={styles.codeContent}>
              <code dangerouslySetInnerHTML={{ __html: formatCode(profile.codePreview.code) }} />
            </pre>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function formatCode(code) {
  return code
    .replace(/const/g, '<span class="keyword">const</span>')
    .replace(/"([^"]+)"/g, '<span class="string">"$1"</span>')
    .replace(/(\w+):/g, '<span class="key">$1</span>:');
}
