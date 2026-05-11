import SectionHeader from '@/components/shared/SectionHeader'
import GlassCard from '@/components/shared/GlassCard'

const notes = [
  {
    title: 'Rust Async Patterns',
    excerpt: 'Deep dive into async/await, tokio runtime, and building concurrent systems in Rust.',
    date: '2025-03-15',
    tags: ['Rust', 'Async', 'Systems'],
  },
  {
    title: 'Neovim Config Deep Dive',
    excerpt: 'Building a productive Neovim configuration from scratch with LSP, treesitter, and custom keymaps.',
    date: '2025-02-28',
    tags: ['Neovim', 'Lua', 'Productivity'],
  },
  {
    title: 'Three.js Shader Tricks',
    excerpt: 'Advanced GLSL techniques for custom shaders, post-processing, and visual effects in Three.js.',
    date: '2025-01-10',
    tags: ['Three.js', 'GLSL', 'Graphics'],
  },
  {
    title: 'TypeScript Performance Tips',
    excerpt: 'Optimizing TypeScript codebases with strict mode, conditional types, and build performance.',
    date: '2024-12-05',
    tags: ['TypeScript', 'Performance'],
  },
]

export default function NotesContent() {
  return (
    <div className="page-content">
      <SectionHeader tag="Thoughts" title="Notes & Snippets" icon="◈" />
      <div className="notes-grid">
        {notes.map((note) => (
          <GlassCard key={note.title} className="note-card">
            <h3 className="note-title">{note.title}</h3>
            <p className="note-excerpt">{note.excerpt}</p>
            <div className="note-meta">
              <span className="note-date">{note.date}</span>
              <div className="note-tags">
                {note.tags.map(t => (
                  <span key={t} className="note-tag">{t}</span>
                ))}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}