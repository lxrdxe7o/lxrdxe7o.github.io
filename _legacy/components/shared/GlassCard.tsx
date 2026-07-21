import { ReactNode } from 'react'
import clsx from 'clsx'

interface GlassCardProps {
  children: ReactNode
  className?: string
}

export default function GlassCard({ children, className }: GlassCardProps) {
  return (
    <div className={clsx('glass-card', className)}>
      {children}
    </div>
  )
}