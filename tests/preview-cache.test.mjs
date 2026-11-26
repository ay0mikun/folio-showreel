import test from 'node:test';
import assert from 'node:assert/strict';
import {previewFrameKey} from '../dist/preview-cache.mjs';
const screens=[{url:'source-a'},{url:'source-b'}];
const settings={seconds:2,fade:.5,background:'solid',solidColor:'#fefefe',padding:8,radius:0,feel:'soft'};
const key=(time,changes={},sources=screens,width=1200)=>previewFrameKey(width,800,time,sources,{...settings,...changes},{url:'background-a'});
test('still-image holds reuse the same rendered frame',()=>{assert.equal(key(0),key(1.4));assert.equal(key(2),key(3.9))});
test('transitions and changes of source cannot reuse a stale frame',()=>{assert.notEqual(key(1.6),key(1.7));assert.notEqual(key(1.4),key(2));assert.notEqual(key(0),key(0,{},screens.toReversed()))});
test('visual edits invalidate the preview',()=>{for(const changes of [{padding:20},{radius:25},{solidColor:'#000000'},{background:'none'}])assert.notEqual(key(0),key(0,changes));assert.notEqual(key(0),key(0,{},screens,2400));assert.notEqual(key(0),previewFrameKey(1200,800,0,screens,settings,{url:'background-b'}))});

test('timing-only changes do not repaint a held image in a twelve-screen composition',()=>{const sources=Array.from({length:12},(_,i)=>({url:`source-${i}`}));const frames=new Set();for(let i=1;i<=99;i++)frames.add(key(0,{seconds:i/10,fade:.05,feel:i%2?'soft':'stiff'},sources));assert.equal(frames.size,1)});
test('transition timing and easing still invalidate an in-progress dissolve',()=>{assert.notEqual(key(1.8),key(1.8,{feel:'stiff'}));assert.notEqual(key(1.8),key(1.8,{fade:.3}))});
