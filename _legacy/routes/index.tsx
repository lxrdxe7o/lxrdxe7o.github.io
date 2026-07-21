import { createFileRoute } from '@tanstack/react-router'
import HomeContent from '@/components/sections/HomeContent'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return <HomeContent />
}