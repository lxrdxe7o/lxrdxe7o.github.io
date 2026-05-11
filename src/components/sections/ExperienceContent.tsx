import SectionHeader from '@/components/shared/SectionHeader'

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

export default function ExperienceContent() {
  return (
    <div className="page-content">
      <SectionHeader tag="Timeline" title="Professional Journey" icon="◈" />
      <div className="timeline">
        {timeline.map((item, i) => (
          <div key={i} className="timeline-item">
            <div className="timeline-marker" />
            <div className="timeline-content">
              <span className="timeline-year">{item.year}</span>
              <h3 className="timeline-title">{item.title}</h3>
              <span className="timeline-company">{item.company}</span>
              <p className="timeline-description">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}