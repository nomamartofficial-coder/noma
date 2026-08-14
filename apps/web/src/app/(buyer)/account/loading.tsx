import styles from '../../../shells/shells.module.css';

export default function AccountLoading() {
  return (
    <section className={styles.loadingLayout} aria-labelledby="account-loading-title" aria-live="polite">
      <h1 className={styles.pageTitle} id="account-loading-title">Loading your account…</h1>
      <p className={styles.pageDescription}>The requested account section is being prepared.</p>
      <div aria-hidden="true" className={styles.skeleton} />
      <div aria-hidden="true" className={`${styles.skeleton} ${styles.skeletonShort}`} />
    </section>
  );
}
