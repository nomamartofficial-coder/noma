import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  validateAutomationBypassSecret,
  validateDeploymentUrl,
  validateHealthResponse,
  validateReleaseSha,
} from './deployment-smoke-policy.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const PROBE_TIMEOUT_MILLISECONDS = 4_000;
const READINESS_DEADLINE_MILLISECONDS = 90_000;
const MAX_RESPONSE_BYTES = 32_768;

const releaseSha = validateReleaseSha(process.env.EXPECTED_RELEASE_SHA);
const vercelAutomationBypassSecret = validateAutomationBypassSecret(process.env.VERCEL_AUTOMATION_BYPASS_SECRET);
const web = validateDeploymentUrl(process.env.WEB_PREVIEW_URL, 'web');
const api = validateDeploymentUrl(process.env.API_STAGING_URL, 'api');

async function readBoundedJson(response) {
  const text = await response.text();
  if (Buffer.byteLength(text) > MAX_RESPONSE_BYTES) throw new Error('health response exceeds the safe size limit');
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('health response is not valid JSON');
  }
}

async function probe(origin, expected) {
  const deadline = Date.now() + READINESS_DEADLINE_MILLISECONDS;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const target = new URL(expected.check === 'liveness' ? '/health/live' : '/health/ready', origin);
      const headers = { accept: 'application/json' };
      if (expected.runtime === 'web' && vercelAutomationBypassSecret !== undefined) {
        headers['x-vercel-protection-bypass'] = vercelAutomationBypassSecret;
      }
      const response = await fetch(target, {
        redirect: 'error',
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MILLISECONDS),
        headers,
      });
      const value = await readBoundedJson(response);
      if (!response.ok) throw new Error(`health endpoint returned HTTP ${response.status}`);
      return validateHealthResponse(value, expected);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error(`deployment did not become healthy before the bounded deadline: ${lastError instanceof Error ? lastError.message : 'unknown failure'}`);
}

const checks = [];
for (const [runtime, environment, origin] of [
  ['web', 'preview', web],
  ['api', 'staging', api],
]) {
  for (const check of ['liveness', 'readiness']) {
    const value = await probe(origin, { runtime, environment, check, releaseSha });
    checks.push(Object.freeze({ runtime, check, status: value.status, checkedAt: value.checkedAt }));
  }
}

const evidence = Object.freeze({
  schemaVersion: 1,
  task: 'DEV-009',
  environment: 'preview-staging',
  releaseSha,
  observedAt: new Date().toISOString(),
  targets: Object.freeze({ webHost: web.hostname, apiHost: api.hostname }),
  checks: Object.freeze(checks),
  providers: Object.freeze({ vercel: 'preview', render: 'staging' }),
  productionActivated: false,
});

const evidencePath = resolve(ROOT, process.env.DEPLOY_SMOKE_EVIDENCE_PATH ?? '.artifacts/deployment/smoke.json');
await mkdir(dirname(evidencePath), { recursive: true });
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: 'utf8', flag: 'w' });
console.log(`PASS: Web preview and API staging health match release ${releaseSha}`);
