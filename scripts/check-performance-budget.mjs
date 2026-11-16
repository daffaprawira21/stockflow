import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const NEXT_BIN = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));

const ROUTE = '/login';
const PORT = 3300;
const BUDGET_KB = 160;
const BASE = `http://127.0.0.1:${PORT}`;

function startServer() {
  const child = spawn(process.execPath, [NEXT_BIN, 'start', '-p', String(PORT)], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', () => {});
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));

  return child;
}

function stopServer(child) {
  if (!child.pid || child.killed) return;

  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }

  child.kill('SIGTERM');
}

async function waitForServer(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(BASE + ROUTE);
      if (response.ok) return;
    } catch {
      // server not accepting connections yet
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Server did not respond on ${BASE}${ROUTE} within ${timeoutMs}ms`);
}

function modernAssets(html) {
  const assets = new Set();

  for (const [, attrs] of html.matchAll(/<script\b([^>]*)>/g)) {
    if (attrs.includes('noModule')) continue;
    const src = attrs.match(/src="(\/_next\/[^"]+\.js)"/)?.[1];
    if (src) assets.add(src);
  }

  for (const [, attrs] of html.matchAll(/<link\b([^>]*)>/g)) {
    if (!attrs.includes('rel="stylesheet"')) continue;
    const href = attrs.match(/href="([^"]+)"/)?.[1];
    if (href) assets.add(href);
  }

  return [...assets];
}

async function measure() {
  const response = await fetch(BASE + ROUTE);
  const html = await response.text();
  const assets = modernAssets(html);

  let raw = 0;
  let gzip = 0;

  for (const path of assets) {
    const asset = await fetch(BASE + path);
    const body = Buffer.from(await asset.arrayBuffer());
    raw += body.length;
    gzip += gzipSync(body, { level: 9 }).length;
  }

  return { raw, gzip, htmlBytes: Buffer.byteLength(html), assets: assets.length };
}

const server = startServer();

try {
  await waitForServer();
  const result = await measure();
  const gzipKb = result.gzip / 1024;
  const rawKb = result.raw / 1024;

  console.log(`Route ${ROUTE}`);
  console.log(`Modern client assets: ${result.assets} files`);
  console.log(`Uncompressed: ${rawKb.toFixed(1)} KB`);
  console.log(`Gzipped:      ${gzipKb.toFixed(1)} KB (budget ${BUDGET_KB} KB)`);
  console.log(`HTML:         ${(result.htmlBytes / 1024).toFixed(1)} KB`);

  if (gzipKb > BUDGET_KB) {
    console.error(`\nPerformance budget exceeded by ${(gzipKb - BUDGET_KB).toFixed(1)} KB.`);
    process.exitCode = 1;
  } else {
    console.log(`\nWithin budget (${(BUDGET_KB - gzipKb).toFixed(1)} KB headroom).`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  stopServer(server);
}
