import { readFile, access, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { airlines } from '../dist/data/airlines.js';
async function checkJs(dir) {
  for (const entry of await readdir(dir,{withFileTypes:true})) {
    const file = resolve(dir,entry.name);
    if (entry.isDirectory()) await checkJs(file);
    else if (/\.(mjs|js)$/.test(file)) { const result = spawnSync(process.execPath,['--check',file],{encoding:'utf8'}); if (result.status) throw new Error(result.stderr); }
  }
}
await checkJs('dist'); await checkJs('scripts');
const html = await readFile('dist/index.html','utf8');
for (const match of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)) await access(resolve('dist',match[1]));
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size,ids.length,'Tekrarlanan DOM kimliği');
for (const adapter of Object.values(airlines)) for (const [title,url] of Object.values(adapter.sources)) {
  assert.ok(title); assert.equal(new URL(url).protocol,'https:'); assert.ok(adapter.verifiedAt);
}
const manifest = JSON.parse(await readFile('.openai/hosting.json','utf8'));
assert.equal(manifest.static.directory,'dist'); assert.ok(manifest.project_id);
console.log('JS sözdizimi, yerel varlıklar, kaynak tanımları ve hosting manifesti doğrulandı.');
