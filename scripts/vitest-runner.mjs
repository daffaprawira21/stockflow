import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const VITEST_BIN = normalizeDriveLetter(
  fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url)),
);

// Vitest loads its runtime twice when the Windows cwd drive letter is lowercase,
// because Vite normalizes module ids to uppercase. See vitest-dev/vitest#10692.
export function normalizeDriveLetter(cwd = process.cwd()) {
  return process.platform === 'win32' && /^[a-z]:/.test(cwd)
    ? cwd[0].toUpperCase() + cwd.slice(1)
    : cwd;
}

export function runVitest(args, env = process.env) {
  const result = spawnSync(process.execPath, [VITEST_BIN, ...args], {
    cwd: normalizeDriveLetter(),
    env,
    stdio: 'inherit',
  });

  return result.status ?? 1;
}
