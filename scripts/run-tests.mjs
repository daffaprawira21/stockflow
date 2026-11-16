import { runVitest } from './vitest-runner.mjs';

process.exit(runVitest(['run', ...process.argv.slice(2)]));
