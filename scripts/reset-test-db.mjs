import { spawnSync } from 'node:child_process';
import { config } from 'dotenv';

config();

const testUrl = process.env.TEST_DATABASE_URL;

if (!testUrl) {
  console.error('TEST_DATABASE_URL is not set.');
  process.exit(1);
}

if (!testUrl.includes('stockflow_test')) {
  console.error('Refusing to reset a database that is not stockflow_test.');
  process.exit(1);
}

if (testUrl === process.env.DATABASE_URL) {
  console.error('TEST_DATABASE_URL must differ from DATABASE_URL.');
  process.exit(1);
}

const result = spawnSync('npx', ['prisma@7.10.1', 'migrate', 'reset', '--force'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    DATABASE_URL: testUrl,
    PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'resetting the dedicated stockflow_test database',
  },
});

process.exit(result.status ?? 1);
