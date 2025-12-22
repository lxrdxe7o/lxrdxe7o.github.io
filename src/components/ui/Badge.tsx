import styles from './Badge.module.css';

interface BadgeProps {
  children: React.ReactNode;
  accent?: boolean;
}

export function Badge({ children, accent = false }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${accent ? styles.accent : ''}`}>
      {children}
    </span>
  );
}
