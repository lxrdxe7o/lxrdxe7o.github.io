import { createFileRoute } from '@tanstack/react-router'
import ProjectsContent from '@/components/sections/ProjectsContent'

export const Route = createFileRoute('/projects')({
  component: Projects,
})

function Projects() {
  return <ProjectsContent />
}