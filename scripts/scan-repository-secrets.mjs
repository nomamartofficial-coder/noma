import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const TEXT_EXTENSIONS = new Set([
  '', '.cjs', '.css', '.csv', '.env', '.example', '.html', '.js', '.json', '.jsx', '.md', '.mjs',
  '.prisma', '.ps1', '.py', '.scss', '.sh', '.sql', '.svg', '.ts', '.tsx', '.txt', '.yaml', '.yml',
]);
const SECRET_PATTERNS = Object.freeze([
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['provider secret key', /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9_-]{24,}\b/],
  ['JWT-like token', /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{16,}\b/],
  ['generic credential assignment', /\b(?:API_KEY|ACCESS_TOKEN|CLIENT_SECRET|PRIVATE_KEY|WEBHOOK_SECRET)\s*[:=]\s*['"]?[A-Za-z0-9_+/=-]{32,}['"]?/i],
]);
const PROHIBITED_FILENAMES = /(?:^|\/)(?:\.env(?:\.(?!example$)[^/]+)?|id_rsa|id_ed25519|[^/]+\.(?:key|p12|pfx|pem))$/i;

const listed = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
  cwd: ROOT,
  encoding: 'utf8',
  windowsHide: true,
});
if (listed.status !== 0) throw new Error('unable to enumerate tracked files for secret scanning');
const paths = listed.stdout.split('\0').filter(Boolean).map((path) => path.replaceAll('\\', '/'));
const failures = [];

for (const path of paths) {
  if (PROHIBITED_FILENAMES.test(path) && !path.endsWith('.env.example')) {
    failures.push(`${path}: prohibited credential-bearing filename`);
    continue;
  }
  if (!TEXT_EXTENSIONS.has(extname(path).toLowerCase())) continue;
  let source;
  try {
    source = await readFile(resolve(ROOT, path), 'utf8');
  } catch {
    continue;
  }
  if (path === 'scripts/validate_governance_foundation.py') {
    source = source.replace('"-----BEGIN PRIVATE KEY-----\\nnot-a-real-key"', '"INTENTIONAL_NEGATIVE_PRIVATE_KEY_SAMPLE"');
  }
  if (path === 'scripts/scan-repository-secrets.mjs') {
    source = source
      .replaceAll('-----BEGIN PRIVATE KEY-----', 'INTENTIONAL_NEGATIVE_PRIVATE_KEY_SAMPLE')
      .replaceAll('AKIA1234567890ABCDEF', 'INTENTIONAL_NEGATIVE_AWS_KEY_SAMPLE');
  }
  for (const [name, pattern] of SECRET_PATTERNS) {
    if (pattern.test(source)) failures.push(`${path}: detected ${name}`);
  }
}

if (failures.length > 0) {
  console.error(`FAIL: repository secret scan rejected ${failures.length} finding(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`PASS: ${paths.length} repository files contain no high-confidence secret patterns`);

if (process.argv.includes('--self-test')) {
  const samples = [
    '-----BEGIN PRIVATE KEY-----',
    `ghp_${'a'.repeat(36)}`,
    'AKIA1234567890ABCDEF',
    `sk_live_${'Z'.repeat(32)}`,
    `ACCESS_TOKEN=${'x'.repeat(40)}`,
  ];
  for (const sample of samples) {
    if (!SECRET_PATTERNS.some(([, pattern]) => pattern.test(sample))) {
      throw new Error('secret scanner negative self-test failed');
    }
  }
  console.log('PASS: injected private key, token, access key, provider key, and credential assignment were rejected');
}
