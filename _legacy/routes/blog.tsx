import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/blog')({
  component: Blog,
})

function Blog() {
  // Redirect externally to Vercel blog
  if (typeof window !== 'undefined') {
    window.location.href = 'https://lxrdxe7o.vercel.app/'
  }
  return null
}