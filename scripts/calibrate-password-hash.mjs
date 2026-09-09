import { calibrateArgon2id, ARGON2ID_POLICY } from '../packages/security/dist/index.js';

const result = await calibrateArgon2id(3);
if (ARGON2ID_POLICY.memoryCost !== 65_536 || ARGON2ID_POLICY.timeCost !== 3 || ARGON2ID_POLICY.parallelism !== 1) {
  throw new Error('Argon2id security parameters no longer match IAM-002 policy');
}
if (result.medianMilliseconds > 1_000 || result.samples.some((sample) => sample > 1_500)) {
  throw new Error(`Argon2id exceeds the reviewed API DoS budget: median=${result.medianMilliseconds.toFixed(1)}ms`);
}
console.log(`PASS: Argon2id m=65536 KiB t=3 p=1 median=${result.medianMilliseconds.toFixed(1)}ms samples=${result.samples.map((sample) => sample.toFixed(1)).join(',')}`);
