import { createFileRoute } from '@tanstack/react-router'
import UsesContent from '@/components/sections/UsesContent'

export const Route = createFileRoute('/uses')({
  component: Uses,
})

function Uses() {
  return <UsesContent />
}