import { spawn, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { config } from 'dotenv';

config();

const testUrl = process.env.TEST_DATABASE_URL;

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!testUrl) {
  fail('TEST_DATABASE_URL is not set.');
}

let testDatabaseName;
try {
  testDatabaseName = new URL(testUrl).pathname.replace(/^\//, '');
} catch {
  fail('TEST_DATABASE_URL must be a valid PostgreSQL URL.');
}

if (testDatabaseName !== 'stockflow_test') {
  fail('TEST_DATABASE_URL must point at the stockflow_test database.');
}

// E2E server, migrations, and seed must all target the dedicated test database,
// regardless of DATABASE_URL in the developer's .env file.
const env = { ...process.env, DATABASE_URL: testUrl };

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: true, env });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('npx', ['prisma@7.10.1', 'migrate', 'deploy']);
run('npx', ['tsx', 'prisma/seed.ts']);

const nextBin = join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');
const server = spawn(process.execPath, [nextBin, 'dev', '--hostname', '127.0.0.1'], {
  stdio: 'inherit',
  env,
});

function shutdown() {
  server.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.on('exit', (code) => {
  process.exit(code ?? 0);
});
