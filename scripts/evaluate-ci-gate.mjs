const raw = process.env.NOMA_CI_REQUIRED_RESULTS;
if (!raw) throw new Error('NOMA_CI_REQUIRED_RESULTS is required');

let needs;
try {
  needs = JSON.parse(raw);
} catch {
  throw new Error('NOMA_CI_REQUIRED_RESULTS must be valid JSON');
}

if (!needs || typeof needs !== 'object' || Array.isArray(needs) || Object.keys(needs).length === 0) {
  throw new Error('at least one required upstream job must be supplied');
}

const failures = [];
for (const [job, detail] of Object.entries(needs)) {
  const result = detail && typeof detail === 'object' ? detail.result : undefined;
  if (result !== 'success') failures.push(`${job}=${result ?? 'missing'}`);
}

if (failures.length > 0) {
  console.error(`FAIL: mandatory CI jobs did not succeed: ${failures.join(', ')}`);
  process.exit(1);
}

console.log(`PASS: ${Object.keys(needs).length} mandatory CI job(s) succeeded`);

