import { createFileRoute } from '@tanstack/react-router'
import NowContent from '@/components/sections/NowContent'

export const Route = createFileRoute('/now')({
  component: Now,
})

function Now() {
  return <NowContent />
}