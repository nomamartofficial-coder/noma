import { Link } from '@noma/ui';
import styles from './shells.module.css';

interface PlaceholderPageProps {
  readonly context: string;
  readonly title: string;
  readonly description: string;
  readonly returnHref?: string;
  readonly returnLabel?: string;
  readonly children?: React.ReactNode;
}

export function PlaceholderPage({
  children,
  context,
  description,
  returnHref = '/',
  returnLabel = 'Shop on Noma',
  title,
}: PlaceholderPageProps) {
  return (
    <section className={styles.placeholderPage}>
      <p className={styles.eyebrow}>{context}</p>
      <h1 className={styles.pageTitle}>{title}</h1>
      <p className={styles.pageDescription}>{description}</p>
      {children}
      <Link className={styles.returnLink} href={returnHref} standalone>{returnLabel}</Link>
    </section>
  );
}
