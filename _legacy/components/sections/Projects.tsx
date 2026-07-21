import { motion } from 'framer-motion'

const projects = [
  {
    title: 'KrakenVim',
    description: 'A modern, highly customizable Neovim configuration built for speed and aesthetics, featuring a custom dashboard and curated plugins.',
    tags: ['Lua', 'Neovim', 'Productivity'],
    link: 'https://github.com/lxrdxe7o/KrakenVim',
  },
  {
    title: 'dotfiles',
    description: 'Personal Arch Linux + Hyprland configuration featuring a highly customized workflow with Waybar, Rofi, and Kitty.',
    tags: ['Shell', 'Linux', 'Hyprland'],
    link: 'https://github.com/lxrdxe7o/dotfiles',
  },
  {
    title: 'xero-shell',
    description: 'A Golden Noir-themed Wayland shell for Hyprland built with Quickshell, featuring OLED-optimized colors and pill-shaped widgets.',
    tags: ['QML', 'Wayland', 'Hyprland'],
    link: 'https://github.com/lxrdxe7o/xero-shell',
  },
  {
    title: 'DeadDrop',
    description: 'Secure, zero-knowledge file sharing platform with client-side encryption, built with React, FastAPI and WebAssembly.',
    tags: ['React', 'FastAPI', 'WASM'],
    link: 'https://github.com/lxrdxe7o/DeadDrop',
  },
  {
    title: 'hachi',
    description: 'A modern TUI for managing ASUS ROG laptops on Linux, featuring power profile management and a cyberpunk aesthetic.',
    tags: ['Rust', 'TUI', 'Linux'],
    link: 'https://github.com/lxrdxe7o/hachi',
  },
  {
    title: 'mikeneko',
    description: 'High-performance Discord music bot built with TypeScript, discord.js v14, and Lavalink v4, supporting multiple audio sources.',
    tags: ['TypeScript', 'Discord.js', 'Lavalink'],
    link: 'https://github.com/lxrdxe7o/mikeneko',
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
