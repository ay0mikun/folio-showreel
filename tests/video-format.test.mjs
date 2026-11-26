import test from 'node:test';
import assert from 'node:assert/strict';
import {videoEncoding} from '../dist/video-format.mjs';
test('prefers MP4 when the browser supports it',()=>assert.equal(videoEncoding(1200,800,()=>true).extension,'mp4'));
test('labels WebM fallback truthfully',()=>assert.equal(videoEncoding(1200,800,type=>type.startsWith('video/webm')).extension,'webm'));
test('preserves odd source dimensions with WebM',()=>assert.equal(videoEncoding(1201,801,()=>true).extension,'webm'));
test('reports an unavailable encoder',()=>assert.equal(videoEncoding(1200,800,()=>false),null));
