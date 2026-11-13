import { config } from 'dotenv';
import { runVitest } from './vitest-runner.mjs';

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

const status = runVitest(['run', '--coverage', '--config', 'vitest.coverage.config.ts'], {
  ...process.env,
  DATABASE_URL: testUrl,
  NODE_ENV: 'test',
});

process.exit(status);
