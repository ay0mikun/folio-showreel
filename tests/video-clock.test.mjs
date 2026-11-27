import test from 'node:test';
import assert from 'node:assert/strict';
import {createVideoClock} from '../dist/video-clock.mjs';
test('encoder startup delays cannot skip the clean first frame',()=>{
  for(const startup of [16,100,500,3000]){const clock=createVideoClock(2);assert.equal(clock(startup),0);assert.equal(clock(startup+100),.1)}
});
test('the full composition duration is measured from the captured opening',()=>{
  const clock=createVideoClock(1.2);assert.equal(clock(4000),0);assert.equal(clock(4600),.6);assert.equal(clock(5400),1.2);
});
