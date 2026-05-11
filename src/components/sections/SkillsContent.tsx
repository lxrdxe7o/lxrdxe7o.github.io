import SectionHeader from '@/components/shared/SectionHeader'
import GlassCard from '@/components/shared/GlassCard'
import { motion } from 'framer-motion'

const skillCategories = [
  {
    title: 'Languages',
    skills: ['TypeScript', 'Rust', 'Python', 'Lua', 'Bash', 'Go'],
  },
  {
    title: 'Frontend',
    skills: ['React', 'Next.js', 'Three.js', 'Framer Motion', 'Tailwind CSS', 'SASS'],
  },
  {
    title: 'Backend',
    skills: ['Node.js', 'Express', 'FastAPI', 'PostgreSQL', 'Redis', 'GraphQL'],
  },
  {
    title: 'DevOps',
    skills: ['Docker', 'GitHub Actions', 'Nginx', 'Linux', 'VPS Management'],
  },
  {
    title: 'Tools',
    skills: ['Neovim', 'VS Code', 'Git', 'Linux', 'Arch BTW'],
  },
  {
    title: '3D & Graphics',
    skills: ['Three.js', 'React Three Fiber', 'GLSL', 'Blender'],
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' }
  }
}

export default function SkillsContent() {
  return (
    <div className="page-content">
      <SectionHeader tag="Technologies" title="Technical Arsenal" icon="◉" />
      <motion.div 
        className="skills-grid-full"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {skillCategories.map((cat) => (
          <motion.div key={cat.title} variants={itemVariants}>
            <GlassCard className="skill-category-card">
              <h3 className="skill-category-title">{cat.title}</h3>
              <div className="skill-tags">
                {cat.skills.map(skill => (
                  <span key={skill} className="skill-tag">{skill}</span>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}