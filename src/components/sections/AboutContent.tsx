import SectionHeader from '@/components/shared/SectionHeader'
import { motion } from 'framer-motion'

const skills = [
  { name: 'TypeScript', level: 95, category: 'Languages' },
  { name: 'React', level: 90, category: 'Frameworks' },
  { name: 'Rust', level: 75, category: 'Languages' },
  { name: 'Python', level: 85, category: 'Languages' },
  { name: 'Three.js', level: 80, category: '3D/Graphics' },
  { name: 'Neovim', level: 90, category: 'Tools' },
  { name: 'Linux/Arch', level: 88, category: 'Tools' },
  { name: 'Lua', level: 70, category: 'Languages' },
  { name: 'Node.js', level: 88, category: 'Frameworks' },
  { name: 'PostgreSQL', level: 82, category: 'Database' },
  { name: 'Docker', level: 80, category: 'DevOps' },
  { name: 'Git', level: 92, category: 'Tools' },
]

const categories = ['Languages', 'Frameworks', '3D/Graphics', 'Tools', 'Database', 'DevOps']

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' }
  }
}

export default function AboutContent() {
  return (
    <div className="page-content">
      <SectionHeader tag="About Me" title="Who I Am" icon="⚛" />
      <motion.div 
        className="about-section"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="about-bio">
          <p>
            I'm a full-stack developer with a deep passion for systems programming,
            Linux, and building performant web applications. I thrive at the intersection
            of clean architecture and creative problem-solving.
          </p>
          <p>
            My journey started with tinkering on Arch Linux, evolved through building
            CLI tools in Rust, and expanded into full-stack web development with React
            and Node.js. I believe in the power of good tooling and clean code.
          </p>
          <p>
            When I'm not coding, you'll find me exploring new technologies, contributing
            to open source, or diving into systems programming concepts.
          </p>
        </motion.div>
        <div className="skills-grid">
          {categories.map(cat => (
            <motion.div key={cat} variants={itemVariants} className="skill-category">
              <h3 className="skill-category-title">{cat}</h3>
              <div className="skill-items">
                {skills.filter(s => s.category === cat).map(skill => (
                  <div key={skill.name} className="skill-item">
                    <div className="skill-info">
                      <span className="skill-name">{skill.name}</span>
                      <span className="skill-level">{skill.level}%</span>
                    </div>
                    <div className="skill-bar">
                      <motion.div 
                        className="skill-progress" 
                        initial={{ width: 0 }}
                        whileInView={{ width: `${skill.level}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}