import { motion } from 'framer-motion';
import styles from './Button.module.css';

export function Button({ 
  children, 
  variant = 'primary', 
  href, 
  icon,
  external = false,
  onClick,
  ...props 
}) {
  const className = `${styles.btn} ${styles[variant]}`;
  
  const content = (
    <>
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </>
  );

  if (href) {
    return (
      <motion.a
        href={href}
        className={className}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.98 }}
        {...props}
      >
        {content}
      </motion.a>
    );
  }

  return (
    <motion.button
      className={className}
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {content}
    </motion.button>
  );
}
