/** A disclosure projection is an immediate, non-authoritative response contract. */
export const DATA_CLASSIFICATIONS = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED', 'SECRET'] as const;
export type DataClassification = (typeof DATA_CLASSIFICATIONS)[number];
export const DISCLOSURE_MODES = ['OMIT', 'DERIVED', 'MASKED', 'FULL'] as const;
export type DisclosureMode = (typeof DISCLOSURE_MODES)[number];
export type DisclosureValue = string | number | boolean | null;

export type DisclosureField = Readonly<{
  key: string;
  classification: DataClassification;
  mode: DisclosureMode;
  maskPolicyId?: string;
  /** A reviewed FULL use case must record why this field is needed. */
  fullPurpose?: string;
}>;

export type DisclosureProjection<TSource, TResult extends Record<string, DisclosureValue>> = Readonly<{
  id: string;
  version: number;
  fields: readonly DisclosureField[];
  /** This mapper must construct a fresh DTO, never return or spread its source. */
  map: (source: Readonly<TSource>) => TResult;
}>;

const ID = /^[a-z][a-z0-9]*(?:[.-][a-z][a-z0-9]*)+\.v[1-9][0-9]*$/;
const KEY = /^[a-z][a-zA-Z0-9]*$/;
const definedProjections = new WeakSet<object>();

export function defineDisclosureProjection<TSource, TResult extends Record<string, DisclosureValue>>(
  projection: DisclosureProjection<TSource, TResult>,
): DisclosureProjection<TSource, TResult> {
  if (!ID.test(projection.id) || !Number.isSafeInteger(projection.version)
    || projection.version < 1 || !projection.id.endsWith(`.v${projection.version}`)
    || !Array.isArray(projection.fields) || projection.fields.length === 0
    || typeof projection.map !== 'function') throw new Error('Invalid disclosure projection');
  const keys = new Set<string>();
  for (const field of projection.fields) {
    if (!KEY.test(field.key) || keys.has(field.key)
      || !DATA_CLASSIFICATIONS.includes(field.classification)
      || !DISCLOSURE_MODES.includes(field.mode)
      || (field.classification === 'SECRET' && field.mode !== 'OMIT')
      || (field.mode === 'MASKED' && (!field.maskPolicyId || !ID.test(field.maskPolicyId)))
      || (field.mode !== 'MASKED' && field.maskPolicyId !== undefined)
      || (field.mode === 'FULL' && (!field.fullPurpose?.trim() || field.classification === 'SECRET'))
      || (field.mode !== 'FULL' && field.fullPurpose !== undefined)) {
      throw new Error('Invalid disclosure field');
    }
    keys.add(field.key);
  }
  const defined = Object.freeze({
    id: projection.id,
    version: projection.version,
    fields: Object.freeze(projection.fields.map((field) => Object.freeze({ ...field }))),
    map: projection.map,
  });
  definedProjections.add(defined);
  return defined;
}

export interface DisclosureProjectionRegistry {
  readonly resolve: (id: string) => Readonly<{ id: string; version: number }> | null;
  readonly contains: (projection: object) => boolean;
}

export function createDisclosureProjectionRegistry(
  projections: readonly Readonly<{ id: string; version: number; fields: readonly DisclosureField[] }>[],
): DisclosureProjectionRegistry {
  const entries = new Map<string, Readonly<{ id: string; version: number; fields: readonly DisclosureField[] }>>();
  for (const projection of projections) {
    if (!definedProjections.has(projection) || !ID.test(projection.id) || !projection.id.endsWith(`.v${projection.version}`)
      || !Object.isFrozen(projection) || !Object.isFrozen(projection.fields)) {
      throw new Error('Invalid disclosure registry entry');
    }
    if (entries.has(projection.id)) throw new Error('Duplicate disclosure projection');
    entries.set(projection.id, projection);
  }
  return Object.freeze({
    resolve(id: string) { return ID.test(id) ? entries.get(id) ?? null : null; },
    contains(projection: object) { return entries.get((projection as { id?: string }).id ?? '') === projection; },
  });
}

/** Enforces the declared output keys even if a mapper accidentally includes extra properties. */
export function projectDisclosure<TSource, TResult extends Record<string, DisclosureValue>>(
  registry: DisclosureProjectionRegistry,
  projection: DisclosureProjection<TSource, TResult>,
  source: Readonly<TSource>,
): Readonly<TResult> {
  try {
    if (!registry.contains(projection)) throw new Error('Disclosure unavailable');
    const mapped = projection.map(source);
    if (Object.is(mapped, source) || typeof mapped !== 'object' || mapped === null || Array.isArray(mapped)) {
      throw new Error('Disclosure unavailable');
    }
    const expected = projection.fields.filter((field) => field.mode !== 'OMIT').map((field) => field.key);
    if (Object.keys(mapped).length !== expected.length
      || expected.some((key) => !Object.hasOwn(mapped, key))) throw new Error('Disclosure unavailable');
    const result: Record<string, unknown> = Object.create(null);
    for (const key of expected) {
      const descriptor = Object.getOwnPropertyDescriptor(mapped, key);
      if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new Error('Disclosure unavailable');
      const value = descriptor.value;
      if (value !== null && typeof value !== 'string' && typeof value !== 'boolean'
        && !(typeof value === 'number' && Number.isFinite(value))) throw new Error('Disclosure unavailable');
      result[key] = value;
    }
    return Object.freeze(result) as TResult;
  } catch {
    // Never let a mapper or exotic source value place raw data in a public error.
    throw new Error('Disclosure unavailable');
  }
}
