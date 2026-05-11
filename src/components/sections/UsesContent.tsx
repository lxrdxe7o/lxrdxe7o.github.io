import SectionHeader from '@/components/shared/SectionHeader'
import GlassCard from '@/components/shared/GlassCard'

const uses = [
  {
    category: 'Hardware',
    items: [
      { name: 'MacBook Pro M3', description: '16GB RAM, primary work machine' },
      { name: 'LG 27" 4K Monitor', description: 'External display for productivity' },
      { name: 'Keychron Q1 Pro', description: 'Mechanical keyboard with Gateron switches' },
    ],
  },
  {
    category: 'Software',
    items: [
      { name: 'Neovim', description: 'Primary editor with custom configuration' },
      { name: 'VS Code', description: 'For collaboration and debugging' },
      { name: 'Alacritty', description: 'GPU-accelerated terminal emulator' },
      { name: 'Arc Browser', description: 'Daily driver for web browsing' },
    ],
  },
  {
    category: 'Services',
    items: [
      { name: 'GitHub', description: 'Version control and collaboration' },
      { name: 'Vercel', description: 'Frontend deployments and blog hosting' },
      { name: 'Cloudflare', description: 'DNS and CDN management' },
    ],
  },
  {
    category: 'Workflow',
    items: [
      { name: 'Zsh + Starship', description: 'Shell with minimal prompt' },
      { name: 'Tmux', description: 'Terminal multiplexing' },
      { name: 'Obsidian', description: 'Note-taking and knowledge management' },
    ],
  },
]

export default function UsesContent() {
  return (
    <div className="page-content">
      <SectionHeader tag="My Setup" title="What I Use" icon="⬡" />
      <div className="uses-grid">
        {uses.map((cat) => (
          <div key={cat.category} className="uses-category">
            <h3 className="uses-category-title">{cat.category}</h3>
            <div className="uses-items">
              {cat.items.map((item) => (
                <GlassCard key={item.name} className="use-item">
                  <h4 className="use-name">{item.name}</h4>
                  <p className="use-description">{item.description}</p>
                </GlassCard>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}