import test from 'node:test';
import assert from 'node:assert/strict';
import {gifFramePlan} from '../dist/gif-plan.mjs';

test('GIF durations match the composition, including fractional screen lengths',()=>{
  for(const count of [1,2,6,12])for(const seconds of [.5,1.5,10,10/6])for(const fade of [.1,.4,Math.min(3,seconds*.8)]){
    const plan=gifFramePlan(count,seconds,fade);
    assert.equal(plan.reduce((sum,frame)=>sum+frame.delay,0),Math.round(count*seconds*100)*10);
    assert.ok(plan.every(frame=>frame.delay>0&&frame.time>=0&&frame.time<count*seconds));
    assert.equal(plan[0].time,0);
  }
});

test('a still image uses one timed frame rather than hundreds of duplicate frames',()=>{
  assert.deepEqual(gifFramePlan(1,10,.5),[{time:0,delay:10000}]);
});

test('transitions sample intermediate times and preserve the final screen hold',()=>{
  const plan=gifFramePlan(2,1.5,.5);
  assert.equal(plan.length,12);
  assert.equal(plan[0].delay,1000);
  assert.ok(plan.slice(1,-1).every(frame=>frame.time>1&&frame.time<1.5&&frame.delay===50));
  assert.deepEqual(plan.at(-1),{time:1.5,delay:1500});
});
