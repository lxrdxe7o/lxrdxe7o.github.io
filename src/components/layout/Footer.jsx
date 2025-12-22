import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <p className={styles.logo}>&lt;xero/&gt;</p>
        <p>&copy; {new Date().getFullYear()} xero. Built with ❤️ and lots of ☕</p>
      </div>
    </footer>
  );
}
