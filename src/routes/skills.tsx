import { createFileRoute } from '@tanstack/react-router'
import SkillsContent from '@/components/sections/SkillsContent'

export const Route = createFileRoute('/skills')({
  component: Skills,
})

function Skills() {
  return <SkillsContent />
}