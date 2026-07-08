import { cp, copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { writeErrorPages } from './scripts/generate-error-pages.mjs';

await rm('dist', { recursive: true, force: true });
await cp('outputs/a-plus-vault', 'dist', { recursive: true });
await rm('dist/data', { recursive: true, force: true });
await copyFile('dist/index.html', 'dist/vault.html');
await mkdir('dist/vault', { recursive: true });
const indexHtml = await readFile('dist/index.html', 'utf8');
await writeFile('dist/vault/index.html', indexHtml
  .replaceAll('href="./styles.css"', 'href="../styles.css"')
  .replaceAll('src="./vault-runtime.js"', 'src="../vault-runtime.js"')
  .replaceAll('src="./supabase-config.js"', 'src="../supabase-config.js"')
  .replaceAll('src="./app.js"', 'src="../app.js"'));
await writeErrorPages('dist', { cssHref: '/styles.css', homeHref: '/vault' });
await writeErrorPages('outputs/a-plus-vault', { cssHref: './styles.css', homeHref: './index.html' });
await import('./scripts/bundle-dist.mjs');
