import styles from './shells.module.css';

export function MarketplaceSearch({ id = 'marketplace-search' }: Readonly<{ id?: string }>) {
  return (
    <form action="/search" className={styles.searchForm} method="get" role="search">
      <label className={styles.visuallyHidden} htmlFor={id}>Search the Noma Marketplace</label>
      <input
        autoComplete="off"
        className={styles.searchInput}
        id={id}
        name="q"
        placeholder="Search products and categories"
        type="search"
      />
      <button className={styles.searchButton} type="submit">Search</button>
    </form>
  );
}
