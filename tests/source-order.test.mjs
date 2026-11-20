import test from 'node:test';
import assert from 'node:assert/strict';
import {sortByFilename,moveSource} from '../dist/source-order.mjs';

test('filenames sort naturally rather than lexicographically',()=>{
  const names=['Screen 10.png','screen 2.png','Screen 1.png','Screen 12.png'];
  assert.deepEqual(sortByFilename(names.map(name=>({name}))).map(s=>s.name),['Screen 1.png','screen 2.png','Screen 10.png','Screen 12.png']);
});
test('numbered exports and equal names keep predictable stable order',()=>{
  const a={name:'02.png',id:'a'},b={name:'02.png',id:'b'};
  assert.deepEqual(sortByFilename([{name:'10.png'},a,{name:'01.png'},b]).map(s=>s.id||s.name),['01.png','a','b','10.png']);
});
test('moving a screen preserves every source and its image identity',()=>{
  const screens=[{name:'1',image:{}},{name:'2',image:{}},{name:'3',image:{}}];
  const result=moveSource(screens,0,2);
  assert.deepEqual(result,[screens[1],screens[2],screens[0]]);
  assert.equal(result[2].image,screens[0].image);
  assert.deepEqual(screens.map(s=>s.name),['1','2','3']);
  assert.deepEqual(moveSource(result,2,0),screens);
});
test('invalid or unchanged moves do not remove screens',()=>{
  const screens=[{},{}];for(const [from,to] of [[0,0],[-1,0],[0,2],[1.5,0]])assert.equal(moveSource(screens,from,to),screens);
});
