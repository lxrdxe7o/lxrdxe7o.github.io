import SectionHeader from '@/components/shared/SectionHeader'

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

export default function AboutContent() {
  return (
    <div className="page-content">
      <SectionHeader tag="About Me" title="Who I Am" icon="⚛" />
      <div className="about-section">
        <div className="about-bio">
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
        </div>
        <div className="skills-grid">
          {categories.map(cat => (
            <div key={cat} className="skill-category">
              <h3 className="skill-category-title">{cat}</h3>
              <div className="skill-items">
                {skills.filter(s => s.category === cat).map(skill => (
                  <div key={skill.name} className="skill-item">
                    <div className="skill-info">
                      <span className="skill-name">{skill.name}</span>
                      <span className="skill-level">{skill.level}%</span>
                    </div>
                    <div className="skill-bar">
                      <div className="skill-progress" style={{ width: `${skill.level}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}