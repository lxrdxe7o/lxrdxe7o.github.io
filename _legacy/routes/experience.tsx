import { createFileRoute } from '@tanstack/react-router'
import ExperienceContent from '@/components/sections/ExperienceContent'

export const Route = createFileRoute('/experience')({
  component: Experience,
})

function Experience() {
  return <ExperienceContent />
}