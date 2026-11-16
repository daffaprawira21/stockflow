import { execSync } from 'node:child_process';

export default function setup() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set for integration tests.');
  }

  if (!databaseUrl.includes('stockflow_test')) {
    throw new Error('Refusing to migrate a database that is not stockflow_test.');
  }

  execSync('npx prisma@7.10.1 migrate deploy', {
    stdio: 'inherit',
    env: process.env,
  });
}
