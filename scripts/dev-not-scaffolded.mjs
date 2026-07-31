const runtime = process.argv[2] ?? 'unknown';
console.error(`${runtime} runtime is intentionally not scaffolded until DEV-002.`);
process.exitCode = 1;
