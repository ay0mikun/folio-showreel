import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const html=readFileSync(resolve(root,'index.html'),'utf8');
const modules=readdirSync(root).filter(name=>/\.(?:js|mjs)$/.test(name));
test('editor DOM references resolve after removing obsolete controls',()=>{
  const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]));
  const app=readFileSync(resolve(root,'app.js'),'utf8');
  for(const [,id] of app.matchAll(/\$\(['"]#([\w-]+)['"]\)/g))assert.ok(ids.has(id),`Missing #${id}`);
});
test('all local module imports and worker entrypoints exist',()=>{
  for(const name of modules){const source=readFileSync(resolve(root,name),'utf8');
    for(const [,target] of source.matchAll(/(?:from\s*|import\s*\(\s*|new URL\(\s*)['"](\.\.?\/[^'"]+)['"]/g))assert.ok(existsSync(resolve(root,target.split('?')[0])),`${name}: missing ${target}`);
  }
});
test('HTML, manifest and stylesheet assets exist locally',()=>{
  const manifest=JSON.parse(readFileSync(resolve(root,'manifest.webmanifest'),'utf8'));
  const references=[...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(match=>match[1]);
  references.push(...manifest.icons.map(icon=>icon.src));
  const css=readFileSync(resolve(root,'style.css'),'utf8');
  references.push(...[...css.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)].map(match=>match[1]));
  for(const target of references.filter(value=>!/^https?:|^data:/.test(value)))assert.ok(existsSync(resolve(root,target.split('?')[0])),`Missing asset ${target}`);
});
