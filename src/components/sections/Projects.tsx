import { motion } from 'framer-motion'

const projects = [
  {
    title: 'Hyprland Dotfiles',
    description: 'Custom Arch Linux + Hyprland configuration with wallust dynamic theming, featuring 45+ automation scripts.',
    tags: ['Linux', 'Shell', 'Hyprland'],
    link: '#',
  },
  {
    title: '3D Portfolio',
    description: 'Interactive WebGL portfolio with Three.js, featuring particle systems and dynamic geometry.',
    tags: ['React', 'Three.js', 'WebGL'],
    link: '#',
  },
  {
    title: 'API Framework',
    description: 'High-performance REST API framework built with Node.js and TypeScript, featuring automatic documentation.',
    tags: ['Node.js', 'TypeScript', 'API'],
    link: '#',
  },
  {
    title: 'CLI Tools Suite',
    description: 'Collection of productivity CLI tools written in Rust and Python for developer workflows.',
    tags: ['Rust', 'Python', 'CLI'],
    link: '#',
  },
]

export default function Projects() {
  return (
    <section className="section projects" id="projects">
      <motion.div
        className="section-header"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6 }}
      >
        <span className="section-tag">Work</span>
        <h2 className="section-title">Featured Projects</h2>
      </motion.div>

      <div className="projects-grid">
        {projects.map((project, index) => (
          <motion.a
            key={project.title}
            href={project.link}
            className="project-card"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: index * 0.15 }}
            whileHover={{ y: -10, scale: 1.02 }}
          >
            <div className="project-content">
              <h3 className="project-title">{project.title}</h3>
              <p className="project-description">{project.description}</p>
              <div className="project-tags">
                {project.tags.map((tag) => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            </div>
            <div className="project-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 17L17 7M17 7H7M17 7V17" />
              </svg>
            </div>
          </motion.a>
        ))}
      </div>
    </section>
  )
}
