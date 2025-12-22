import { motion } from 'framer-motion';
import { skillCategories } from '../../data/skills';
import styles from './Skills.module.css';

export function Skills() {
  return (
    <motion.section 
      id="skills" 
      className={styles.section}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6 }}
    >
      <h2 className={styles.title}>
        <span className={styles.icon}>💻</span> Tech Stack
      </h2>
      
      <div className={styles.grid}>
        {skillCategories.map((category, catIndex) => (
          <motion.div 
            key={category.title}
            className={styles.category}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: catIndex * 0.1 }}
          >
            <h3 className={styles.categoryTitle}>{category.title}</h3>
            <ul className={styles.list}>
              {category.skills.map((skill, skillIndex) => (
                <motion.li 
                  key={skill.name}
                  className={styles.skill}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: skillIndex * 0.05 }}
                  whileHover={{ x: 5 }}
                >
                  <span className={styles.skillIcon}>{skill.icon}</span>
                  {skill.name}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
