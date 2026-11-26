import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeedbackPrompt} from '../dist/feedback.mjs';
function fixture(){let now=0,next=0,visible=true,shown=0;const timers=new Map();const prompt=createFeedbackPrompt({show:()=>shown++,canShow:()=>visible,setTimer:(fn,delay)=>{const id=++next;timers.set(id,{fn,at:now+delay});return id},clearTimer:id=>timers.delete(id)});return {prompt,get shown(){return shown},set visible(v){visible=v},tick(ms){now+=ms;for(const [id,timer] of [...timers])if(timer.at<=now){timers.delete(id);timer.fn()}}}}
test('invitation appears after thirty idle seconds and activity resets the deadline',()=>{const f=fixture();f.prompt.activity();f.tick(29000);assert.equal(f.shown,0);f.prompt.activity();f.tick(29000);assert.equal(f.shown,0);f.tick(1000);assert.equal(f.shown,1)});
test('successful export requests an invitation immediately and it never repeats in the visit',()=>{const f=fixture();assert.equal(f.prompt.request(),true);f.prompt.activity();f.tick(30000);f.prompt.request();assert.equal(f.shown,1)});
test('hidden tabs, rendering and other open dialogs defer the invitation',()=>{const f=fixture();f.visible=false;f.prompt.activity();f.tick(30000);assert.equal(f.shown,0);assert.equal(f.prompt.request(),false);f.visible=true;f.tick(30000);assert.equal(f.shown,1)});
test('visibility suspension stops idle timing until activity resumes',()=>{const f=fixture();f.prompt.activity();f.prompt.stop();f.tick(60000);assert.equal(f.shown,0);f.prompt.activity();f.tick(30000);assert.equal(f.shown,1)});
