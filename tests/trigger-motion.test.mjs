import test from 'node:test';
import assert from 'node:assert/strict';
import {triggerOrigin} from '../dist/trigger-motion.mjs';
test('motion origin follows the triggering control rather than the panel center',()=>{assert.equal(triggerOrigin({left:1100,top:20,width:80,height:24},{left:420,top:80}),'720px -48px')});
test('popover origin stays attached to its trigger when positioned above it',()=>{assert.equal(triggerOrigin({left:920,top:600,width:36,height:36},{left:920,top:320}),'18px 298px')});
