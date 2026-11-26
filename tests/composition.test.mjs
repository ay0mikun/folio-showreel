import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveSize,sizeError,fitRect,previewDimensions,BACKGROUNDS} from '../dist/composition.mjs';
const a={id:'a',width:1200,height:800},b={id:'b',width:600,height:1000};
test('native export dimensions exactly match the selected source',()=>{
  assert.deepEqual(resolveSize([a,b],{sizeMode:'source',sizeSourceId:'a'}),[1200,800]);
  assert.deepEqual(resolveSize([b,a],{sizeMode:'source',sizeSourceId:'a'}),[1200,800]);
  assert.deepEqual(resolveSize([a,b],{sizeMode:'source',sizeSourceId:'b'}),[600,1000]);
});
test('custom sizing preserves exact dimensions, including odd dimensions',()=>{
  assert.deepEqual(resolveSize([a],{sizeMode:'custom',width:1201,height:801}),[1201,801]);
});
test('a removed size reference falls back to an available image',()=>{
  assert.deepEqual(resolveSize([b],{sizeMode:'source',sizeSourceId:'a'}),[600,1000]);
});
test('matching dimensions fill the output with no added spacing',()=>{
  assert.deepEqual(fitRect(1200,800,1200,800),{x:0,y:0,width:1200,height:800});
});
test('screens fit without cropping, while background images cover the canvas',()=>{
  assert.deepEqual(fitRect(1200,800,1600,800),{x:200,y:0,width:1200,height:800});
  const background=fitRect(1200,800,1600,800,true);
  assert.equal(background.width,1600);assert.ok(background.height>=800);assert.ok(background.y<0);
});
test('invalid sizes are rejected before allocating export frames',()=>{
  for(const [w,h] of [[0,800],[1200,-1],[NaN,800],[1200.5,800],[10000,800],[8192,8192]])assert.ok(sizeError(w,h));
  assert.equal(sizeError(1200,800),'');assert.equal(sizeError(1201,801),'');
});
test('preview dimensions retain aspect ratio without changing export size',()=>{
  assert.deepEqual(previewDimensions(1200,800),[1200,800]);
  const [w,h]=previewDimensions(6000,4000);assert.ok(w<=1280&&h<=900);assert.ok(Math.abs(w/h-1.5)<.002);
});
test('background defaults use the requested exact colors',()=>{
  assert.deepEqual(BACKGROUNDS,{light:'#fefefe',dark:'#0e0e0e'});
});

test('padding insets the source without changing its aspect ratio',async()=>{
  const {screenRect}=await import('../dist/composition.mjs');
  assert.deepEqual(screenRect(1200,800,1200,800,0),{x:0,y:0,width:1200,height:800});
  const rect=screenRect(1200,800,1200,800,20);
  assert.equal(rect.height,640);assert.equal(rect.width/rect.height,1.5);
  assert.equal(rect.x,(1200-rect.width)/2);assert.equal(rect.y,80);
});
test('padded portrait and landscape sources remain within the canvas',async()=>{
  const {screenRect}=await import('../dist/composition.mjs');
  for(const [sw,sh] of [[600,1000],[1200,800]])for(const padding of [0,20,80]){
    const rect=screenRect(sw,sh,1200,800,padding),inset=800*padding/200;
    assert.ok(rect.x>=inset-.00001&&rect.y>=inset-.00001);
    assert.ok(rect.x+rect.width<=1200-inset+.00001&&rect.y+rect.height<=800-inset+.00001);
    assert.ok(Math.abs(rect.width/rect.height-sw/sh)<1e-10);
  }
});
