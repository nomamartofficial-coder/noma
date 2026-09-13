import { SafeEncryptionError } from './encryption.js';

export interface MaskingPolicy {
  readonly visiblePrefix: number;
  readonly visibleSuffix: number;
  readonly minimumHidden: number;
  readonly maskCharacter: string;
}

/** Pure presentation masking; it does not grant access to the underlying value. */
export function maskSensitiveValue(value: string, policy: MaskingPolicy): string {
  const { visiblePrefix, visibleSuffix, minimumHidden, maskCharacter } = policy;
  if (
    typeof value !== 'string'
    || !Number.isSafeInteger(visiblePrefix) || visiblePrefix < 0
    || !Number.isSafeInteger(visibleSuffix) || visibleSuffix < 0
    || !Number.isSafeInteger(minimumHidden) || minimumHidden < 1
    || typeof maskCharacter !== 'string' || [...maskCharacter].length !== 1
  ) throw new SafeEncryptionError('INVALID_INPUT');
  const points = [...value];
  const hidden = points.length - visiblePrefix - visibleSuffix;
  if (hidden < minimumHidden) throw new SafeEncryptionError('INVALID_INPUT');
  return points.slice(0, visiblePrefix).join('') + maskCharacter.repeat(hidden) + points.slice(points.length - visibleSuffix).join('');
}
