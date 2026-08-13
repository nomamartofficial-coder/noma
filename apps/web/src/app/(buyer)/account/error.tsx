'use client';

import { Button, Link } from '@noma/ui';
import styles from '../../../shells/shells.module.css';

interface AccountErrorProps {
  readonly error: Error & { readonly digest?: string };
  readonly reset: () => void;
}

export default function AccountError({ reset }: AccountErrorProps) {
  return (
    <section aria-labelledby="account-error-title">
      <p className={styles.eyebrow}>My account</p>
      <h1 className={styles.pageTitle} id="account-error-title">We couldn’t load this account section</h1>
      <p className={styles.pageDescription}>Try the request again. If the problem continues, return to the account overview and choose another section.</p>
      <div className={styles.errorActions}>
        <Button onClick={reset} variant="primary">Try again</Button>
        <Link href="/account" standalone>Back to account overview</Link>
      </div>
    </section>
  );
}
