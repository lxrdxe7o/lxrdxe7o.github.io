import { motion } from 'framer-motion'

const skills = [
  { name: 'TypeScript', level: 95 },
  { name: 'React', level: 92 },
  { name: 'Node.js', level: 88 },
  { name: 'Python', level: 85 },
  { name: 'Linux', level: 90 },
  { name: 'WebGL/Three.js', level: 80 },
]

export default function About() {
  return (
    <section className="section about" id="about">
      <motion.div
        className="section-header"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6 }}
      >
        <span className="section-tag">About</span>
        <h2 className="section-title">Who I Am</h2>
      </motion.div>

      <div className="about-grid">
        <motion.div
          className="about-text"
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <p>
            A passionate developer with expertise in full-stack development and a deep love for Linux systems. I thrive on creating elegant solutions to complex problems and constantly push the boundaries of what's possible with code.
          </p>
          <p>
            When I'm not coding, you'll find me customizing my Arch Linux setup, contributing to open source projects, or exploring the latest in web technologies.
          </p>
        </motion.div>

        <motion.div
          className="skills-grid"
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {skills.map((skill, index) => (
            <motion.div
              key={skill.name}
              className="skill-item"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <div className="skill-header">
                <span className="skill-name">{skill.name}</span>
                <span className="skill-level">{skill.level}%</span>
              </div>
              <div className="skill-bar">
                <motion.div
                  className="skill-progress"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${skill.level}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.5 + index * 0.1 }}
                />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
