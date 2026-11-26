import test from 'node:test';
import assert from 'node:assert/strict';
import {hexToHsv,hsvToHex} from '../dist/color-picker.mjs';
test('picker preserves exact colors through HSV conversion',()=>{
  for(const color of ['#fefefe','#000000','#ff0000','#fffb00','#d500ff','#270070','#1e3128','#739bff']){const {h,s,v}=hexToHsv(color);assert.equal(hsvToHex(h,s,v),color)}
});
test('hue wraps and saturation/value remain within the color gamut',()=>{
  assert.equal(hsvToHex(360,1,1),'#ff0000');assert.equal(hsvToHex(-120,1,1),'#0000ff');assert.equal(hsvToHex(0,2,2),'#ff0000');assert.equal(hsvToHex(90,-1,1),'#ffffff');assert.equal(hsvToHex(0,1,-1),'#000000');
});
