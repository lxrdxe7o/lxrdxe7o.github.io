import { motion } from 'framer-motion';
import { Card } from '../ui';
import { projects } from '../../data/projects';
import styles from './Projects.module.css';

export function Projects() {
  return (
    <motion.section 
      id="projects" 
      className={styles.section}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6 }}
    >
      <h2 className={styles.title}>
        <span className={styles.icon}>🚀</span> Featured Projects
      </h2>
      
      <div className={styles.grid}>
        {projects.map((project, index) => (
          <Card key={project.id} project={project} index={index} />
        ))}
      </div>
    </motion.section>
  );
}
