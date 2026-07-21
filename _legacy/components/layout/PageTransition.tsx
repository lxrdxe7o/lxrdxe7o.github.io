import { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PageTransitionProps {
  children: ReactNode
  routeKey?: string
}

export default function PageTransition({ children, routeKey }: PageTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={routeKey}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        className="page-transition-wrapper"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}