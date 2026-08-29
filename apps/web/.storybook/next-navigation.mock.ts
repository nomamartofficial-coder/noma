let storyPathname = '/';

const pathnamePattern = /^\/(?:[^\s?#]*)$/;

export function setStoryPathname(value: unknown): void {
  if (value === undefined) {
    storyPathname = '/';
    return;
  }
  if (typeof value !== 'string' || !pathnamePattern.test(value)) {
    throw new Error('Storybook pathname must be an absolute path without whitespace, a query, or a fragment');
  }
  storyPathname = value;
}

export function usePathname(): string {
  return storyPathname;
}
