import { spawnSync } from 'node:child_process';
import { config } from 'dotenv';

config();

const testUrl = process.env.TEST_DATABASE_URL;

if (!testUrl) {
  console.error('TEST_DATABASE_URL is not set.');
  process.exit(1);
}

if (!testUrl.includes('stockflow_test')) {
  console.error('TEST_DATABASE_URL must point at the stockflow_test database.');
  process.exit(1);
}

if (testUrl === process.env.DATABASE_URL) {
  console.error('TEST_DATABASE_URL must differ from DATABASE_URL.');
  process.exit(1);
}

const result = spawnSync(
  'npx',
  ['vitest', 'run', '--coverage', '--config', 'vitest.coverage.config.ts'],
  {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      DATABASE_URL: testUrl,
      NODE_ENV: 'test',
    },
  },
);

process.exit(result.status ?? 1);
