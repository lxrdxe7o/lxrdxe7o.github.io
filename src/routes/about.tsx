import { createFileRoute } from '@tanstack/react-router'
import AboutContent from '@/components/sections/AboutContent'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return <AboutContent />
}