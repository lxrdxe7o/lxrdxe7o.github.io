import styles from './Badge.module.css';

export function Badge({ children, accent = false }) {
  return (
    <span className={`${styles.badge} ${accent ? styles.accent : ''}`}>
      {children}
    </span>
  );
}
