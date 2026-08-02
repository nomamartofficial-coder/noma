import { spawnSync } from 'node:child_process';

if (process.env.GITHUB_ACTIONS !== 'true' || process.env.CI !== 'true') {
  throw new Error('CI infrastructure cleanup is restricted to an isolated GitHub Actions runner');
}

const containerList = docker(['ps', '-aq']);
const containerIds = containerList.split(/\s+/).filter(Boolean);
const approvedContainerIds = [];
const unexpectedContainerIds = [];

for (const id of containerIds) {
  const labels = docker(['inspect', '--format', '{{json .Config.Labels}}', id]);
  const parsed = JSON.parse(labels || '{}') ?? {};
  const project = parsed['com.docker.compose.project'] ?? '';
  const testcontainers = parsed['org.testcontainers'] === 'true' || Boolean(parsed['org.testcontainers.session-id']);
  if (project.startsWith('noma-dev004-') || project.startsWith('noma-dev005-') || testcontainers) {
    approvedContainerIds.push(id);
  } else {
    unexpectedContainerIds.push(id);
  }
}

if (unexpectedContainerIds.length > 0) {
  throw new Error('unexpected non-Noma containers exist on the isolated GitHub Actions runner');
}
if (approvedContainerIds.length > 0) docker(['rm', '--force', '--volumes', ...approvedContainerIds]);

const volumeRows = docker(['volume', 'ls', '--format', '{{.Name}}']).split(/\r?\n/).filter(Boolean);
const approvedVolumes = volumeRows.filter((name) =>
  name.startsWith('noma-dev004-') || name.startsWith('noma-dev005-') || name.startsWith('testcontainers-'));
if (approvedVolumes.length > 0) docker(['volume', 'rm', '--force', ...approvedVolumes]);

const remaining = docker(['ps', '-aq']);
if (remaining.trim()) throw new Error('unexpected containers remain after bounded GitHub Actions cleanup');
console.log(`PASS: removed ${approvedContainerIds.length} disposable container(s) and ${approvedVolumes.length} disposable volume(s)`);

function docker(args) {
  const result = spawnSync('docker', args, { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) {
    throw new Error(`docker ${args[0]} failed during CI cleanup`);
  }
  return result.stdout.trim();
}
