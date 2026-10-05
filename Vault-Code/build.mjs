import { cp, copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { writeErrorPages } from './scripts/generate-error-pages.mjs';

await rm('dist', { recursive: true, force: true });
await cp('outputs/a-plus-vault', 'dist', { recursive: true });
await rm('dist/data', { recursive: true, force: true });
await copyFile('dist/index.html', 'dist/vault.html');
await mkdir('dist/vault', { recursive: true });
const indexHtml = await readFile('dist/index.html', 'utf8');
await writeFile('dist/vault/index.html', indexHtml);
await writeErrorPages('dist', { homeHref: '/vault', legalHref: '/legal.html' });
await writeErrorPages('outputs/a-plus-vault', {
  homeHref: './index.html',
  legalHref: './legal.html',
});
await import('./scripts/bundle-dist.mjs');

// Stamp the service worker so every deploy gets fresh caches (old ones are dropped on activate).
const buildId = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 8) || Date.now().toString(36);
const sw = await readFile('dist/sw.js', 'utf8');
if (!sw.includes('const BUILD = "dev";')) throw new Error('sw.js: BUILD placeholder missing');
await writeFile('dist/sw.js', sw.replace('const BUILD = "dev";', `const BUILD = "${buildId}";`));

