import { motion } from 'framer-motion';
import { Badge } from './Badge';
import type { Project } from '../../types';
import styles from './Card.module.css';

interface CardProps {
  project: Project;
  index?: number;
}

export function Card({ project, index = 0 }: CardProps) {
  const { title, icon, description, tags, accentTag, features, github, featured } = project;

  return (
    <motion.article
      className={`${styles.card} ${featured ? styles.featured : ''}`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -8 }}
    >
      <div className={styles.header}>
        <span className={styles.icon}>{icon}</span>
        <div className={styles.badges}>
          {tags.map(tag => (
            <Badge key={tag}>{tag}</Badge>
          ))}
          {accentTag && <Badge accent>{accentTag}</Badge>}
        </div>
      </div>
      
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      
      <ul className={styles.features}>
        {features.map((feature, i) => (
          <li key={i}>{feature}</li>
        ))}
      </ul>
      
      <div className={styles.links}>
        <a href={github} target="_blank" rel="noopener noreferrer" className={styles.link}>
          <span>View on GitHub</span> →
        </a>
      </div>
    </motion.article>
  );
}
