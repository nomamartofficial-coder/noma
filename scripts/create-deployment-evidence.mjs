import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { validateReleaseSha } from './deployment-smoke-policy.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const smokePath = resolve(ROOT, process.env.DEPLOY_SMOKE_EVIDENCE_PATH ?? '.artifacts/deployment/smoke.json');
const outputPath = resolve(ROOT, process.env.DEPLOY_EVIDENCE_PATH ?? '.artifacts/deployment/evidence-manifest.json');
const smoke = JSON.parse(await readFile(smokePath, 'utf8'));

if (smoke.task !== 'DEV-009' || smoke.environment !== 'preview-staging') throw new Error('deployment smoke evidence has the wrong scope');
if (smoke.productionActivated !== false) throw new Error('deployment evidence must prove production remains inactive');
const releaseSha = validateReleaseSha(smoke.releaseSha);
if (!Array.isArray(smoke.checks) || smoke.checks.length !== 4 || smoke.checks.some((item) => item.status !== 'ok')) {
  throw new Error('deployment smoke evidence is incomplete');
}
if (!smoke.targets?.webHost?.endsWith('.vercel.app') || !smoke.targets?.apiHost?.endsWith('.onrender.com')) {
  throw new Error('deployment smoke evidence contains unapproved target classes');
}

const manifest = Object.freeze({
  schemaVersion: 1,
  task: 'DEV-009',
  issue: 26,
  environment: 'preview-staging',
  releaseSha,
  generatedAt: new Date().toISOString(),
  result: 'pass',
  migration: Object.freeze({ owner: 'noma-api-staging', command: 'pnpm db:migrate:deploy', strategy: 'forward-only' }),
  health: Object.freeze({ web: 'pass', api: 'pass', worker: 'provider-deploy-evidence-required' }),
  targets: smoke.targets,
  production: Object.freeze({ provisioned: false, deployed: false, activated: false }),
  sensitiveValuesIncluded: false,
});

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', flag: 'w' });
console.log(`PASS: redacted deployment evidence created for ${releaseSha}`);
