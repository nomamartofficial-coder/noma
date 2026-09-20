import { describe, expect, test } from 'vitest';
import { maskSensitiveValue } from '../../security/src/masking.js';
import {
  createDisclosureProjectionRegistry,
  defineDisclosureProjection,
  projectDisclosure,
} from '../src/privacy/index.js';

describe('IAM-007 closed disclosure projections', () => {
  test('requires a versioned exact identity and rejects duplicate, wildcard and secret output', () => {
    const projection = defineDisclosureProjection({
      id: 'synthetic.contact.summary.v1', version: 1,
      fields: [{ key: 'status', classification: 'INTERNAL', mode: 'DERIVED' }],
      map: () => ({ status: 'AVAILABLE' }),
    });
    expect(() => createDisclosureProjectionRegistry([projection, projection])).toThrow();
    expect(() => defineDisclosureProjection({ ...projection, id: 'all-fields' })).toThrow();
    expect(() => defineDisclosureProjection({ ...projection, id: 'synthetic.contact.summary.v2' })).toThrow();
    expect(() => defineDisclosureProjection({ ...projection, fields: [
      { key: 'token', classification: 'SECRET', mode: 'FULL', fullPurpose: 'test' },
    ] })).toThrow();
    expect(() => defineDisclosureProjection({ ...projection, fields: [
      { key: 'value', classification: 'RESTRICTED', mode: 'FULL' },
    ] })).toThrow();
    const registry = createDisclosureProjectionRegistry([projection]);
    expect(registry.resolve('synthetic.contact.summary.v1')).toBe(projection);
    expect(registry.resolve('synthetic.contact.summary.v2')).toBeNull();
    expect(registry.resolve('admin.*')).toBeNull();
  });

  test('OMIT, DERIVED, MASKED and reviewed FULL return only declared data', () => {
    const raw = 'contact@example.test';
    const restricted = 'restricted-sentinel-do-not-disclose';
    const source = Object.freeze({ raw, restricted, id: 'synthetic-id', secret: 'secret-sentinel' });
    const projection = defineDisclosureProjection({
      id: 'synthetic.contact.display.v1', version: 1,
      fields: [
        { key: 'contact', classification: 'CONFIDENTIAL', mode: 'MASKED', maskPolicyId: 'synthetic.contact.partial.v1' },
        { key: 'state', classification: 'INTERNAL', mode: 'DERIVED' },
        { key: 'reference', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Exact synthetic reference' },
        { key: 'restricted', classification: 'RESTRICTED', mode: 'OMIT' },
        { key: 'secret', classification: 'SECRET', mode: 'OMIT' },
      ],
      map: (input: typeof source) => ({
        contact: maskSensitiveValue(input.raw, { visiblePrefix: 2, visibleSuffix: 5, minimumHidden: 1, maskCharacter: '•' }),
        state: input.raw.length ? 'PRESENT' : 'ABSENT',
        reference: input.id,
      }),
    });
    const registry = createDisclosureProjectionRegistry([projection]);
    const dto = projectDisclosure(registry, projection, source);
    expect(Object.keys(dto)).toEqual(['contact', 'state', 'reference']);
    expect(dto.contact).toBe('co•••••••••••••.test');
    expect(dto.state).toBe('PRESENT');
    expect(dto.reference).toBe('synthetic-id');
    for (const sentinel of [raw, restricted, 'secret-sentinel']) expect(JSON.stringify(dto)).not.toContain(sentinel);
    expect(Object.getPrototypeOf(dto)).toBeNull();
    expect(() => projectDisclosure(registry, { ...projection }, source)).toThrow('Disclosure unavailable');
  });

  test('rejects source aliases, extra keys and getter side effects', () => {
    const source = { safe: 'safe', hidden: 'restricted-sentinel' };
    const fields = [{ key: 'safe', classification: 'PUBLIC' as const, mode: 'FULL' as const, fullPurpose: 'Synthetic public field' }];
    for (const map of [
      () => source,
      () => ({ safe: 'safe', hidden: source.hidden }),
      () => Object.defineProperty({}, 'safe', { enumerable: true, get: () => source.hidden }),
      () => ({ safe: { nested: source.hidden } }),
    ]) {
      const projection = defineDisclosureProjection({ id: 'synthetic.safe.read.v1', version: 1, fields, map: map as () => { safe: string } });
      expect(() => projectDisclosure(createDisclosureProjectionRegistry([projection]), projection, source)).toThrow('Disclosure unavailable');
    }
  });

  test('replaces raw-data mapper failures with a generic non-leaking error', () => {
    const raw = 'restricted-error-sentinel';
    const projection = defineDisclosureProjection({
      id: 'synthetic.error.view.v1', version: 1,
      fields: [{ key: 'safe', classification: 'INTERNAL', mode: 'DERIVED' }],
      map: (_source: { raw: string }): { safe: string } => { throw new Error(raw); },
    });
    const registry = createDisclosureProjectionRegistry([projection]);
    try {
      projectDisclosure(registry, projection, { raw });
      throw new Error('expected rejection');
    } catch (error) {
      expect(error).toEqual(new Error('Disclosure unavailable'));
      expect(String(error)).not.toContain(raw);
    }
  });

  test('SEC-003 masking preserves Unicode code points without irreversibility claims', () => {
    const value = 'A🟣BCZ';
    const masked = maskSensitiveValue(value, { visiblePrefix: 1, visibleSuffix: 1, minimumHidden: 3, maskCharacter: '•' });
    expect([...masked]).toEqual(['A', '•', '•', '•', 'Z']);
    expect(() => maskSensitiveValue(value, { visiblePrefix: 3, visibleSuffix: 3, minimumHidden: 1, maskCharacter: '•' })).toThrow();
  });

  test('narrowing FULL to MASKED to OMIT cannot retain the raw field', () => {
    const source = { email: 'person@example.test' };
    const full = defineDisclosureProjection({
      id: 'synthetic.email.view.v1', version: 1,
      fields: [{ key: 'email', classification: 'CONFIDENTIAL', mode: 'FULL', fullPurpose: 'Synthetic exact full view' }],
      map: (value: typeof source) => ({ email: value.email }),
    });
    const masked = defineDisclosureProjection({
      id: 'synthetic.email.view.v2', version: 2,
      fields: [{ key: 'email', classification: 'CONFIDENTIAL', mode: 'MASKED', maskPolicyId: 'synthetic.email.partial.v1' }],
      map: (value: typeof source) => ({ email: maskSensitiveValue(value.email, { visiblePrefix: 1, visibleSuffix: 5, minimumHidden: 1, maskCharacter: '•' }) }),
    });
    const omitted = defineDisclosureProjection({
      id: 'synthetic.email.view.v3', version: 3,
      fields: [{ key: 'email', classification: 'CONFIDENTIAL', mode: 'OMIT' }],
      map: (_value: typeof source) => ({}),
    });
    const registry = createDisclosureProjectionRegistry([full, masked, omitted]);
    expect(projectDisclosure(registry, full, source)).toEqual({ email: source.email });
    expect(Object.keys(projectDisclosure(registry, masked, source))).toEqual(['email']);
    expect(JSON.stringify(projectDisclosure(registry, masked, source))).not.toContain(source.email);
    expect(projectDisclosure(registry, omitted, source)).toEqual({});
    expect(registry.resolve('synthetic.email.view.v4')).toBeNull();
  });
});
