import SectionHeader from '@/components/shared/SectionHeader'
import GlassCard from '@/components/shared/GlassCard'

const nowItems = [
  {
    category: 'Building',
    items: [
      { title: 'This Portfolio', description: 'Full redesign with TanStack suite and unique 3D scenes per page' },
      { title: 'hachi', description: 'HTTP server library in Rust with async support' },
    ],
  },
  {
    category: 'Learning',
    items: [
      { title: 'Rust WASM', description: 'WebAssembly compilation and browser interop' },
      { title: 'System Design', description: 'Distributed systems patterns and architecture' },
    ],
  },
  {
    category: 'Reading',
    items: [
      { title: 'Structure and Interpretation of Computer Programs (SICP)', description: 'Classic CS text on computation and programming' },
      { title: 'The Rust Programming Language', description: 'Deepening Rust knowledge' },
    ],
  },
]

export default function NowContent() {
  return (
    <div className="page-content">
      <SectionHeader tag="Currently" title="What I'm Working On" icon="⚡" />
      <div className="now-section">
        {nowItems.map((section) => (
          <div key={section.category} className="now-category">
            <h3 className="now-category-title">{section.category}</h3>
            <div className="now-items">
              {section.items.map((item) => (
                <GlassCard key={item.title} className="now-item">
                  <h4 className="now-item-title">{item.title}</h4>
                  <p className="now-item-description">{item.description}</p>
                </GlassCard>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}