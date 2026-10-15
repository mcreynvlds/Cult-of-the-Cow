// Copies the playable web game into www/, which Capacitor bundles into the native apps.
import { cpSync, rmSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'www');
const entries = ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'icons'];

rmSync(out, { recursive: true, force: true });
mkdirSync(out);
for (const e of entries) cpSync(join(root, e), join(out, e), { recursive: true });
console.log(`Built web assets into ${out}`);
