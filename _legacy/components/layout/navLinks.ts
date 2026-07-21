export interface NavLink {
  to: string
  label: string
  icon: string
}

export const navLinks: NavLink[] = [
  { to: '/', label: 'Home', icon: '✦' },
  { to: '/about', label: 'About', icon: '⚛' },
  { to: '/projects', label: 'Projects', icon: '⚙' },
  { to: '/experience', label: 'Experience', icon: '◈' },
  { to: '/skills', label: 'Skills', icon: '◉' },
  { to: '/uses', label: 'Uses', icon: '⬡' },
  { to: '/notes', label: 'Notes', icon: '◈' },
  { to: '/now', label: 'Now', icon: '⚡' },
  { to: '/contact', label: 'Contact', icon: '◇' },
  { to: 'https://lxrdxe7o.vercel.app/', label: 'Blog', icon: '✎' },
]
