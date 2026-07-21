import SectionHeader from '@/components/shared/SectionHeader'
import { motion } from 'framer-motion'

const timeline = [
  {
    year: '2023 - Present',
    title: 'Full-Stack Developer',
    company: 'Freelance / Personal Projects',
    description: 'Building modern web applications, contributing to open source, and exploring systems programming with Rust.',
  },
  {
    year: '2021 - 2023',
    title: 'Frontend Developer',
    company: 'Various Projects',
    description: 'Developed responsive web applications using React, TypeScript, and modern CSS frameworks.',
  },
  {
    year: '2020',
    title: 'Introduction to Programming',
    company: 'Self-taught',
    description: 'Started with Python and C, discovered a passion for systems programming and open source.',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.2 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.5, ease: 'easeOut' }
  }
}

export default function ExperienceContent() {
  return (
    <div className="page-content">
      <SectionHeader tag="Timeline" title="Professional Journey" icon="◈" />
      <motion.div 
        className="timeline"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {timeline.map((item, i) => (
          <motion.div key={i} variants={itemVariants} className="timeline-item">
            <div className="timeline-marker" />
            <div className="timeline-content">
              <span className="timeline-year">{item.year}</span>
              <h3 className="timeline-title">{item.title}</h3>
              <span className="timeline-company">{item.company}</span>
              <p className="timeline-description">{item.description}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}