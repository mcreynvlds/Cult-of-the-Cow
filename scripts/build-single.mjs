// Packs the whole game (HTML + CSS + JS + icon) into one self-contained file: dist/CultOfTheCow.html.
// It works when opened straight from disk, from a download, or from an email attachment.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

let html = read('index.html');
const icon = 'data:image/svg+xml;base64,' + Buffer.from(read('icons/icon.svg')).toString('base64');

html = html
  .replace(/<link rel="manifest"[^>]*>\n?/, '')
  .replace(/<link rel="apple-touch-icon"[^>]*>\n?/, '')
  .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="${icon}" type="image/svg+xml">`)
  .replace(/<link rel="stylesheet" href="([^"]+)">/, (_, p) => `<style>\n${read(p)}\n</style>`)
  .replace(/<script src="([^"]+)"><\/script>/g, (_, p) => `<script>\n${read(p).replace(/<\/script/gi, '<\\/script')}\n</script>`);

if (/(href|src)="(css|js|icons)\//.test(html)) throw new Error('Unresolved local reference left in single-file build');

mkdirSync(join(root, 'dist'), { recursive: true });
const out = join(root, 'dist', 'CultOfTheCow.html');
writeFileSync(out, html);
console.log(`Wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
