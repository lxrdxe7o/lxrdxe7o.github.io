import { createFileRoute } from '@tanstack/react-router'
import ContactContent from '@/components/sections/ContactContent'

export const Route = createFileRoute('/contact')({
  component: Contact,
})

function Contact() {
  return <ContactContent />
}