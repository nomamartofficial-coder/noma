import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, relative, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const staticRoot = resolve(root, 'apps/web/storybook-static');
const mode = process.argv[2] ?? 'test';
const isLinux = process.platform === 'linux';

if (!['test', 'update'].includes(mode)) throw new Error(`Unsupported visual mode: ${mode}`);
if (!existsSync(join(staticRoot, 'index.html'))) throw new Error('Build Storybook before running visual tests');
if (mode === 'update' && process.env.CI) throw new Error('Visual baselines must never be updated in CI');
if (mode === 'update' && !isLinux) throw new Error('Canonical baselines may only be updated on Linux/Ubuntu 24.04');

const mimeTypes = Object.freeze({
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
});

const server = createServer(async (request, response) => {
  try {
    const requestPath = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
    const selected = requestPath === '/' ? '/index.html' : requestPath;
    const candidate = normalize(resolve(staticRoot, `.${selected}`));
    if (relative(staticRoot, candidate).startsWith('..')) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    const metadata = await stat(candidate);
    if (!metadata.isFile()) throw new Error('Not a file');
    response.writeHead(200, {
      'cache-control': 'no-store',
      'content-type': mimeTypes[extname(candidate)] ?? 'application/octet-stream',
      'x-content-type-options': 'nosniff',
    });
    createReadStream(candidate).pipe(response);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
  }
});

await new Promise((resolveListen, rejectListen) => {
  server.once('error', rejectListen);
  server.listen(0, '127.0.0.1', resolveListen);
});

const address = server.address();
if (!address || typeof address === 'string') throw new Error('Unable to resolve Storybook server address');
const baseUrl = `http://127.0.0.1:${address.port}`;
const pnpmCli = process.env.npm_execpath;
if (!pnpmCli) throw new Error('Run visual tests through pnpm so the pinned CLI can be resolved');

const args = [pnpmCli, '--filter', '@noma/web', 'exec', 'playwright', 'test', '--config', 'playwright.visual.config.ts'];
if (mode === 'update') args.push('--update-snapshots=all');

const child = spawn(process.execPath, args, {
  cwd: root,
  env: {
    ...process.env,
    NOMA_STORYBOOK_BASE_URL: baseUrl,
    NOMA_VISUAL_MODE: isLinux ? 'compare' : 'smoke',
  },
  stdio: 'inherit',
  windowsHide: true,
});

const exitCode = await new Promise((resolveExit, rejectExit) => {
  child.once('error', rejectExit);
  child.once('exit', (code) => resolveExit(code ?? 1));
}).finally(() => new Promise((resolveClose) => server.close(resolveClose)));

if (exitCode !== 0) process.exit(exitCode);
console.log(isLinux ? `PASS: ${mode === 'update' ? 'updated' : 'matched'} canonical Linux visual baselines` : 'PASS: Storybook visual manifest browser smoke (pixel comparison disabled on non-Linux)');
