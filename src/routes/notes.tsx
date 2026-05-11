import { createFileRoute } from '@tanstack/react-router'
import NotesContent from '@/components/sections/NotesContent'

export const Route = createFileRoute('/notes')({
  component: Notes,
})

function Notes() {
  return <NotesContent />
}