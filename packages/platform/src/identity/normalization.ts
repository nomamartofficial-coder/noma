const MAX_EMAIL_LENGTH = 320;

export function normalizeIdentityEmail(value: string): string {
  const normalized = value.trim().normalize('NFC').toLocaleLowerCase('und');
  if (!normalized || normalized.length > MAX_EMAIL_LENGTH) {
    throw new Error('email must contain 1 to 320 characters after normalization');
  }
  const at = normalized.indexOf('@');
  if (at <= 0 || at !== normalized.lastIndexOf('@') || at === normalized.length - 1) {
    throw new Error('email must contain one non-terminal @ separator');
  }
  if (/\s/u.test(normalized)) throw new Error('email must not contain whitespace');
  return normalized;
}
