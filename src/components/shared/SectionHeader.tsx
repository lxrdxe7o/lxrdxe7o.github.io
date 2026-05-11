interface SectionHeaderProps {
  tag: string
  title: string
  icon: string
}

export default function SectionHeader({ tag, title, icon }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <span className="section-tag">{tag}</span>
      <h2 className="section-title">
        <span className="section-icon">{icon}</span>
        {title}
      </h2>
    </div>
  )
}