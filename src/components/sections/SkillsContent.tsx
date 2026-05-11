import SectionHeader from '@/components/shared/SectionHeader'
import GlassCard from '@/components/shared/GlassCard'

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

export default function SkillsContent() {
  return (
    <div className="page-content">
      <SectionHeader tag="Technologies" title="Technical Arsenal" icon="◉" />
      <div className="skills-grid-full">
        {skillCategories.map((cat) => (
          <GlassCard key={cat.title} className="skill-category-card">
            <h3 className="skill-category-title">{cat.title}</h3>
            <div className="skill-tags">
              {cat.skills.map(skill => (
                <span key={skill} className="skill-tag">{skill}</span>
              ))}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}