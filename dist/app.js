import {gifFramePlan} from './gif-plan.mjs';
import {sortByFilename,moveSource} from './source-order.mjs';
'use strict';
const $=s=>document.querySelector(s);
const FPS=30,MAX_IMAGES=12;
let screens=[],settings={seconds:1.5,fade:.5,feel:'soft',format:'video',orderMode:'name'},playing=false,position=0,lastFrame=0,db=null,saveTimer,outputURL=null,rendering=false,cancelRender=null;
const canvas=$('#preview'),context=canvas.getContext('2d',{alpha:false});
const totalDuration=()=>screens.length*settings.seconds;
const even=n=>Math.max(2,Math.round(n/2)*2);
function outputSize(){return [1920,1080]}
function formatTime(t){const tenths=Math.round(t*10),minutes=Math.floor(tenths/600),seconds=(tenths%600)/10;return `${String(minutes).padStart(2,'0')}:${seconds.toFixed(1).padStart(4,'0')}`}
function notify(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('#toast').classList.remove('visible'),4500)}
function setError(message){$('#uploadError').textContent=message;$('#uploadError').hidden=!message}
function setPlaying(value){playing=value;$('#play').textContent=value?'Ⅱ':'▶';$('#play').setAttribute('aria-label',value?'Pause preview':'Play preview')}
// Quintic smoothstep: zero velocity and acceleration at both ends of the dissolve.
function ease(t){t=Math.max(0,Math.min(1,t));if(settings.feel==='stiff')return Math.max(0,Math.min(1,(t-.4)*5));return t*t*t*(t*(t*6-15)+10)}
function drawScreen(c,screen,w,h,opacity=1){const scale=Math.min(w/screen.width,h/screen.height),dw=screen.width*scale,dh=screen.height*scale;c.save();c.globalAlpha=opacity;c.fillStyle='#101510';const x=(w-dw)/2,y=(h-dh)/2;if(y>0){c.fillRect(0,0,w,y);c.fillRect(0,y+dh,w,h-y-dh)}if(x>0){c.fillRect(0,y,x,dh);c.fillRect(x+dw,y,w-x-dw,dh)}c.drawImage(screen.image,x,y,dw,dh);c.restore()}
function draw(c,w,h,t){c.fillStyle='#101510';c.fillRect(0,0,w,h);if(!screens.length)return;const index=Math.min(screens.length-1,Math.floor(Math.max(0,t)/settings.seconds)),local=t-index*settings.seconds,transition=settings.fade;drawScreen(c,screens[index],w,h);if(index<screens.length-1&&local>settings.seconds-transition){const alpha=ease((local-(settings.seconds-transition))/transition);drawScreen(c,screens[index+1],w,h,alpha)}}
function updatePreview(){if(!screens.length)return;draw(context,canvas.width,canvas.height,position);$('#currentTime').textContent=formatTime(position);$('#scrubber').value=position;let index=Math.min(screens.length-1,Math.floor(position/settings.seconds));$('#previewStatus').textContent=`Screen ${index+1} of ${screens.length}`}
function frame(now){if(lastFrame&&playing&&!rendering){position=Math.min(totalDuration(),position+(now-lastFrame)/1000);if(position>=totalDuration())setPlaying(false)}lastFrame=now;if(playing)updatePreview();requestAnimationFrame(frame)}
function sync(){const has=screens.length>0,total=totalDuration(),[w,h]=outputSize();$('#count').textContent=screens.length+' / '+MAX_IMAGES;$('#preview').hidden=!has;$('#emptyPreview').hidden=has;$('#play').disabled=$('#restart').disabled=$('#scrubber').disabled=$('#export').disabled=!has;$('#clearAll').hidden=!has;$('#durationLabel').textContent=formatTime(total);$('#scrubber').max=total||1;position=Math.min(position,total);$('#currentTime').textContent=formatTime(position);$('#scrubber').value=position;$('#resolutionLabel').textContent=`${w} × ${h}`;$('#exportMeta').textContent=has?`${total.toFixed(1)} seconds · ${w} × ${h} · ${settings.format==='gif'?'GIF':'30 fps'}`:'Add a screen to get started';$('#exportFormat').value=settings.format;$('#export').textContent=settings.format==='gif'?'Export GIF':'Export video';$('#formatHint').textContent=settings.format==='gif'?'Looping · 20 fps transitions · 256 colors per frame':'30 fps · MP4 where supported';$('#screenDurationRange').value=settings.seconds;$('#fadeDurationRange').max=Number(Math.min(3,settings.seconds*.8).toFixed(3));$('#fadeDurationRange').value=settings.fade;const feel=settings.feel==='stiff'?'Stiff':'Soft';$('#transitionLabel').textContent=feel+' dissolve';document.querySelectorAll('[data-feel]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.feel===settings.feel)));$('#feelDescription').textContent=settings.feel==='stiff'?'A sharper switch with a short, direct dissolve.':'Gentle easing through the full transition.';$('#perScreenLabel').textContent=Number(settings.seconds.toFixed(2))+'s';$('#screenDuration').value=Number(settings.seconds.toFixed(3));$('#totalDuration').value=Number(total.toFixed(2));$('#totalDuration').disabled=!has;$('#totalDuration').min=screens.length*.1;$('#totalDuration').max=screens.length*10;$('#timingCount').textContent=screens.length+(screens.length===1?' screen':' screens');$('#fadeDuration').max=Number(Math.min(3,settings.seconds*.8).toFixed(3));$('#fadeDuration').value=Number(settings.fade.toFixed(3));$('#fadeLabel').textContent=feel+' dissolve · '+Number(settings.fade.toFixed(2))+'s';$('#sortByName').disabled=screens.length<2;$('#sourceOrderHint').textContent=settings.orderMode==='custom'?'Custom order · drag to reorder':'Filename order · drag to reorder';if(!has){$('#previewStatus').textContent='Waiting for your first screen';setPlaying(false)}updatePreview();renderList()}
function renderList(){const list=$('#imageList');list.replaceChildren();screens.forEach((screen,index)=>{const row=document.createElement('div');row.className='image-item';row.dataset.index=index;row.setAttribute('role','listitem');const handle=document.createElement('button');handle.className='drag-handle';handle.type='button';handle.setAttribute('aria-label',`Reorder ${screen.name}`);handle.title='Drag to reorder, or use the up and down arrow keys';handle.innerHTML='<svg viewBox="0 0 16 24" aria-hidden="true"><circle cx="5" cy="6" r="1"/><circle cx="11" cy="6" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="11" cy="12" r="1"/><circle cx="5" cy="18" r="1"/><circle cx="11" cy="18" r="1"/></svg>';handle.onkeydown=e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();reorderScreen(index,index+(e.key==='ArrowUp'?-1:1),true)}};row.onpointerdown=e=>startSourceDrag(e,row,index);const img=document.createElement('img');img.src=screen.url;img.alt='';img.draggable=false;const info=document.createElement('div');info.className='image-info';const name=document.createElement('span');name.className='image-name';name.textContent=`${String(index+1).padStart(2,'0')} · ${screen.name}`;name.title=screen.name;const size=document.createElement('span');size.className='image-size';size.textContent=`${screen.width} × ${screen.height} · ${Number(settings.seconds.toFixed(2))}s`;info.append(name,size);const actions=document.createElement('div');actions.className='image-actions';for(const [dir,label,offset] of [['↑','Move earlier',-1],['↓','Move later',1]]){const button=document.createElement('button');button.textContent=dir;button.setAttribute('aria-label',`${label}: ${screen.name}`);button.disabled=index+offset<0||index+offset>=screens.length;button.onclick=()=>reorderScreen(index,index+offset);actions.append(button)}const remove=document.createElement('button');remove.className='remove-image';remove.textContent='×';remove.setAttribute('aria-label',`Remove ${screen.name}`);remove.onclick=()=>{setPlaying(false);screens.splice(index,1);URL.revokeObjectURL(screen.url);position=0;sync();save()};row.append(handle,img,info,actions,remove);list.append(row)})}
function reorderScreen(from,to,restoreFocus=false){
  const next=moveSource(screens,from,to);if(next===screens)return;
  const name=screens[from].name;screens=next;settings.orderMode='custom';position=0;setPlaying(false);sync();save();
  if(restoreFocus)$('#imageList').children[to]?.querySelector('.drag-handle')?.focus();
  notify(`Moved ${name} to position ${to+1}.`);
}
let sourceDrag=null;
function startSourceDrag(event,row,index){
  const handle=event.target.closest('.drag-handle');
  if(rendering||sourceDrag||screens.length<2||event.button!==0||event.target.closest('button')&&!handle||event.pointerType!=='mouse'&&!handle)return;
  sourceDrag={row,from:index,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,x:event.clientX,y:event.clientY,active:false,insert:index,raf:0};
  row.setPointerCapture(event.pointerId);
  row.addEventListener('pointermove',sourcePointerMove);row.addEventListener('pointerup',sourcePointerUp);row.addEventListener('pointercancel',sourcePointerCancel);row.addEventListener('lostpointercapture',sourcePointerCancel);
}
function sourcePointerMove(event){
  const d=sourceDrag;if(!d||event.pointerId!==d.pointerId)return;
  d.x=event.clientX;d.y=event.clientY;
  if(!d.active&&Math.hypot(d.x-d.startX,d.y-d.startY)>5){
    d.active=true;setPlaying(false);d.row.classList.add('source-dragging');document.body.classList.add('source-reordering');
    const rect=d.row.getBoundingClientRect();d.offsetX=d.startX-rect.left;d.offsetY=d.startY-rect.top;
    d.ghost=d.row.cloneNode(true);d.ghost.className='image-item source-drag-ghost';d.ghost.setAttribute('aria-hidden','true');d.ghost.inert=true;d.ghost.style.width=rect.width+'px';document.body.append(d.ghost);
    sourceDragTick();
  }
  if(d.active){event.preventDefault();updateSourceTarget()}
}
function updateSourceTarget(){
  const d=sourceDrag;if(!d?.active)return;
  d.ghost.style.left=(d.x-d.offsetX)+'px';d.ghost.style.top=(d.y-d.offsetY)+'px';
  const list=$('#imageList'),box=list.getBoundingClientRect(),rows=[...list.children];let best=null,bestDistance=Infinity;
  for(const row of rows){row.classList.remove('drop-before','drop-after');const rect=row.getBoundingClientRect();if(rect.bottom<box.top||rect.top>box.bottom)continue;const dx=d.x-Math.max(rect.left,Math.min(rect.right,d.x)),dy=d.y-Math.max(rect.top,Math.min(rect.bottom,d.y)),distance=dx*dx+dy*dy;if(distance<bestDistance){best=row;bestDistance=distance}}
  if(!best)return;
  const rect=best.getBoundingClientRect(),after=d.y>rect.top+rect.height/2;
  d.insert=Number(best.dataset.index)+(after?1:0);
  const to=d.insert>d.from?d.insert-1:d.insert;
  if(to!==d.from)best.classList.add(after?'drop-after':'drop-before');
}
function sourceDragTick(){
  const d=sourceDrag;if(!d?.active)return;
  const list=$('#imageList'),rect=list.getBoundingClientRect();
  if(d.y<rect.top+30)list.scrollTop-=Math.min(12,(rect.top+30-d.y)/3);
  else if(d.y>rect.bottom-30)list.scrollTop+=Math.min(12,(d.y-rect.bottom+30)/3);
  updateSourceTarget();d.raf=requestAnimationFrame(sourceDragTick);
}
function finishSourceDrag(commit){
  const d=sourceDrag;if(!d)return;sourceDrag=null;cancelAnimationFrame(d.raf);d.ghost?.remove();d.row.classList.remove('source-dragging');document.body.classList.remove('source-reordering');
  for(const row of $('#imageList').children)row.classList.remove('drop-before','drop-after');
  for(const [type,fn] of [['pointermove',sourcePointerMove],['pointerup',sourcePointerUp],['pointercancel',sourcePointerCancel],['lostpointercapture',sourcePointerCancel]])d.row.removeEventListener(type,fn);
  if(d.row.hasPointerCapture(d.pointerId))d.row.releasePointerCapture(d.pointerId);
  if(commit&&d.active)reorderScreen(d.from,d.insert>d.from?d.insert-1:d.insert);
}
function sourcePointerUp(event){if(sourceDrag?.pointerId===event.pointerId)finishSourceDrag(true)}
function sourcePointerCancel(){finishSourceDrag(false)}
window.addEventListener('blur',sourcePointerCancel);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&sourceDrag){event.preventDefault();sourcePointerCancel()}});
function imageFromURL(url){return new Promise((resolve,reject)=>{let image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=url})}
async function normalizeImage(image){const normalized=document.createElement('canvas');normalized.width=1920;normalized.height=1080;const c=normalized.getContext('2d',{alpha:false});c.fillStyle='#101510';c.fillRect(0,0,1920,1080);const scale=Math.min(1920/image.naturalWidth,1080/image.naturalHeight);const w=image.naturalWidth*scale,h=image.naturalHeight*scale;c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(image,(1920-w)/2,(1080-h)/2,w,h);const blob=await new Promise((resolve,reject)=>normalized.toBlob(b=>b?resolve(b):reject(new Error('Image conversion failed')),'image/png'));const url=URL.createObjectURL(blob);try{return {blob,url,image:await imageFromURL(url),width:1920,height:1080}}catch(e){URL.revokeObjectURL(url);throw e}}
async function acceptFiles(fileList){await ready;setError('');const files=sortByFilename([...fileList]);if(screens.length>=MAX_IMAGES){setError('Your showreel already has 12 screens. Remove one to add another.');return}let errors=[],added=0;for(const file of files){if(screens.length>=MAX_IMAGES){errors.push('Only the first 12 valid screens were added.');break}if(!['image/png','image/jpeg','image/webp'].includes(file.type)){errors.push(`${file.name}: use PNG, JPG or WebP.`);continue}if(file.size>40*1024*1024){errors.push(`${file.name}: please keep each image under 40 MB.`);continue}const url=URL.createObjectURL(file);try{const image=await imageFromURL(url),w=image.naturalWidth,h=image.naturalHeight;if(!w||!h)throw new Error('Empty image');const normalized=await normalizeImage(image);URL.revokeObjectURL(url);screens.push({name:file.name,...normalized});added++}catch{URL.revokeObjectURL(url);errors.push(`${file.name} could not be opened. Try exporting it again.`)}}$('#files').value='';if(added){if(settings.orderMode==='name')screens=sortByFilename(screens);position=0;sync();save();setPlaying(!matchMedia('(prefers-reduced-motion: reduce)').matches);notify(`${added} screen${added===1?'':'s'} added. Your ${totalDuration().toFixed(1)}-second showreel is ready to preview.`)}setError(errors.join(' '))}
async function init(){try{db=await new Promise((resolve,reject)=>{const request=indexedDB.open('folio-showreel',1);request.onupgradeneeded=()=>request.result.createObjectStore('projects');request.onsuccess=()=>resolve(request.result);request.onerror=reject});const stored=await new Promise((resolve,reject)=>{const request=db.transaction('projects').objectStore('projects').get('current');request.onsuccess=()=>resolve(request.result);request.onerror=reject});if(stored){settings={...settings,...stored.settings};if(!['soft','stiff'].includes(settings.feel))settings.feel='soft';if(!['video','gif'].includes(settings.format))settings.format='video';if(!['name','custom'].includes(settings.orderMode))settings.orderMode='name';settings.seconds=Math.max(.1,Math.min(10,Number(settings.seconds)||1.5));settings.fade=Math.max(.02,Math.min(3,settings.seconds*.8,Number(settings.fade)||.5));for(const entry of stored.screens.slice(0,MAX_IMAGES)){const url=URL.createObjectURL(entry.blob);try{const image=await imageFromURL(url);if(image.naturalWidth!==1920||image.naturalHeight!==1080){const normalized=await normalizeImage(image);URL.revokeObjectURL(url);screens.push({name:entry.name,...normalized})}else screens.push({...entry,url,image})}catch{URL.revokeObjectURL(url)}}if(settings.orderMode==='name')screens=sortByFilename(screens)}sync()}catch{$('#saveStatus').textContent='Device storage unavailable · this session only'}}
function save(){clearTimeout(saveTimer);$('#saveStatus').textContent='Saving on this device…';saveTimer=setTimeout(()=>{if(!db){$('#saveStatus').textContent='This session only';return}try{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put({settings,screens:screens.map(({name,width,height,blob})=>({name,width,height,blob}))},'current');tx.oncomplete=()=>$('#saveStatus').textContent='Saved automatically on this device';tx.onerror=()=>{$('#saveStatus').textContent='Could not save · keep this tab open';notify('Device storage is full. You can still create and download your video.')}}catch{$('#saveStatus').textContent='Could not save · keep this tab open'}},200)}
const ready=init();requestAnimationFrame(frame);
$('#upload').onclick=$('#emptyUpload').onclick=()=>$('#files').click();$('#files').onchange=e=>acceptFiles(e.target.files);for(const area of [$('#upload'),$('#dropStage')]){area.ondragover=e=>{e.preventDefault();area.classList.add('dragover')};area.ondragleave=()=>area.classList.remove('dragover');area.ondrop=e=>{e.preventDefault();area.classList.remove('dragover');if(!rendering)acceptFiles(e.dataTransfer.files)}}
$('#clearAll').onclick=()=>{screens.forEach(s=>URL.revokeObjectURL(s.url));screens=[];settings.orderMode='name';position=0;setError('');sync();save()};$('#play').onclick=()=>{if(position>=totalDuration())position=0;setPlaying(!playing);updatePreview()};$('#restart').onclick=()=>{position=0;setPlaying(true);updatePreview()};$('#scrubber').oninput=e=>{position=Number(e.target.value);setPlaying(false);updatePreview()};function timingChanged(){position=0;setPlaying(false);settings.fade=Math.min(settings.fade,settings.seconds*.8);sync();save()}
$('#screenDuration').onchange=async e=>{const v=Number(e.target.value);await ready;settings.seconds=Math.min(10,Math.max(.1,Number.isFinite(v)&&v>0?v:1.5));timingChanged()};
$('#totalDuration').onchange=async e=>{const v=Number(e.target.value);await ready;if(!screens.length)return;settings.seconds=Math.min(10,Math.max(.1,(Number.isFinite(v)&&v>0?v:totalDuration())/screens.length));timingChanged()};
$('#fadeDuration').onchange=async e=>{const v=Number(e.target.value);await ready;settings.fade=Math.max(.02,Math.min(3,settings.seconds*.8,Number.isFinite(v)&&v>0?v:.5));timingChanged()};
document.querySelectorAll('[data-feel]').forEach(button=>button.onclick=async()=>{await ready;settings.feel=button.dataset.feel;sync();save()});
$('#exportFormat').onchange=async e=>{const value=e.target.value;await ready;settings.format=value;sync();save()};
$('#screenDurationRange').oninput=async e=>{const v=Number(e.target.value);await ready;settings.seconds=v;timingChanged()};
$('#fadeDurationRange').oninput=async e=>{const v=Number(e.target.value);await ready;settings.fade=v;timingChanged()};
$('#resetTiming').onclick=async()=>{await ready;settings.seconds=1.5;timingChanged()};
$('#resetTransition').onclick=async()=>{await ready;settings.feel='soft';settings.fade=Math.min(.5,settings.seconds*.8);sync();save()};
$('#resetSettings').onclick=async()=>{await ready;settings={seconds:1.5,fade:.5,feel:'soft',format:'video',orderMode:settings.orderMode};position=0;setPlaying(false);sync();save();notify('Settings reset. Your screens are kept.')};
$('#sortByName').onclick=async()=>{await ready;screens=sortByFilename(screens);settings.orderMode='name';position=0;setPlaying(false);sync();save();notify('Screens sorted by filename.')};
$('#guideButton').onclick=()=>$('#guide').showModal();$('#guide .close').onclick=()=>$('#guide').close();
// MediaRecorder streams WebM without a Duration entry. Add it so players can seek
// and show the correct length. Segment size in streamed WebM is unspecified.
async function addWebmDuration(blob,duration){const bytes=new Uint8Array(await blob.arrayBuffer());function read(offset,id=false){if(offset>=bytes.length)return null;let mask=128,n=1;while(n<=8&&!(bytes[offset]&mask)){mask>>=1;n++}if(n>8||offset+n>bytes.length)return null;let value=id?bytes[offset]:bytes[offset]&(mask-1);for(let i=1;i<n;i++)value=value*256+bytes[offset+i];return {value,n}}
function encodeSize(value,n){if(value>=2**(7*n)-1)return null;const b=new Uint8Array(n);let v=value;for(let i=n-1;i>=0;i--){b[i]=v%256;v=Math.floor(v/256)}b[0]|=1<<(8-n);return b}
let offset=0,segment=null;while(offset<bytes.length){const id=read(offset,true);if(!id)break;const size=read(offset+id.n);if(!size)break;const start=offset+id.n+size.n;if(id.value===0x18538067){segment={start,size,offset:offset+id.n};break}offset=start+size.value}if(!segment)return blob;offset=segment.start;while(offset<bytes.length){const id=read(offset,true),size=id&&read(offset+id.n);if(!id||!size)break;const start=offset+id.n+size.n,end=start+size.value;if(end>bytes.length)break;if(id.value===0x1549a966){let scale=1000000,child=start;while(child<end){const cid=read(child,true),cs=cid&&read(child+cid.n);if(!cid||!cs)return blob;const pos=child+cid.n+cs.n;if(cid.value===0x4489)return blob;if(cid.value===0x2ad7b1){scale=0;for(let k=0;k<cs.value;k++)scale=scale*256+bytes[pos+k]}child=pos+cs.value}const newSize=encodeSize(size.value+11,size.n);if(!newSize)return blob;const durationEntry=new Uint8Array(11);durationEntry.set([0x44,0x89,0x88]);new DataView(durationEntry.buffer).setFloat64(3,duration*1e9/scale,false);const result=new Uint8Array(bytes.length+11);result.set(bytes.slice(0,offset+id.n));result.set(newSize,offset+id.n);result.set(bytes.slice(start,end),start);result.set(durationEntry,end);result.set(bytes.slice(end),end+11);return new Blob([result],{type:blob.type})}offset=end}return blob}
async function exportVideo(){await ready;if(!screens.length||rendering)return;const [w,h]=outputSize();if(typeof MediaRecorder==='undefined'||!canvas.captureStream){notify('Video export is not supported in this browser. Please use a recent Chrome, Edge, or Safari.');return}const mime=['video/mp4;codecs=avc1.420033','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));if(!mime){notify('This browser cannot encode video. Please try a recent Chrome or Edge.');return}let recorder,stream,frameID,cancelled=false,hidden=false;const dialog=$('#renderDialog'),duration=totalDuration();setPlaying(false);position=0;updatePreview();rendering=true;document.body.classList.add('rendering');$('#renderTitle').textContent='Creating your showreel.';$('#renderDescription').textContent='Keep this tab visible while your video renders.';$('#renderProgress').value=0;$('#renderPercent').textContent='0%';$('#cancelRender').hidden=false;$('#download').hidden=$('#backToEditor').hidden=$('#renderedVideo').hidden=$('#renderedGif').hidden=true;$('#renderedGif').removeAttribute('src');$('#renderedVideo').pause();$('#renderedVideo').removeAttribute('src');dialog.showModal();cancelRender=()=>{cancelled=true;cancelAnimationFrame(frameID);if(recorder&&recorder.state!=='inactive')recorder.stop()};$('#cancelRender').onclick=()=>cancelRender?.();dialog.oncancel=e=>{e.preventDefault();cancelRender?.()};const onVisibility=()=>{if(document.hidden){hidden=true;cancelRender?.()}};document.addEventListener('visibilitychange',onVisibility);
try{const out=document.createElement('canvas');out.width=w;out.height=h;const c=out.getContext('2d',{alpha:false});if(!c||out.width!==w||out.height!==h)throw new Error('Unsupported canvas size');draw(c,w,h,0);stream=out.captureStream(FPS);const bitrate=Math.min(60_000_000,Math.max(10_000_000,Math.round(w*h*FPS*.18)));recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:bitrate});const chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};const stopped=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=e=>reject(e.error||new Error('Video encoder error'))});recorder.start(200);const start=performance.now();const tick=now=>{const t=Math.min(duration,(now-start)/1000);draw(c,w,h,Math.min(t,duration-.001));position=t;updatePreview();const pct=Math.min(100,Math.round(t/duration*100));$('#renderProgress').value=pct;$('#renderPercent').textContent=pct+'%';if(t<duration&&!cancelled)frameID=requestAnimationFrame(tick);else if(recorder.state!=='inactive')recorder.stop()};frameID=requestAnimationFrame(tick);await stopped;if(cancelled){dialog.close();notify(hidden?'Rendering stopped because the tab was hidden. Keep it visible and try again.':'Video creation cancelled.');return}if(!chunks.length)throw new Error('No video frames');let blob=new Blob(chunks,{type:recorder.mimeType||mime});if(mime.includes('webm')){try{blob=await addWebmDuration(blob,duration)}catch{}}if(outputURL)URL.revokeObjectURL(outputURL);outputURL=URL.createObjectURL(blob);const ext=mime.includes('mp4')?'mp4':'webm';$('#download').href=outputURL;$('#download').download=`folio-showreel-${w}x${h}.${ext}`;$('#download').textContent=`Download ${ext.toUpperCase()} · ${(blob.size/1024/1024).toFixed(1)} MB`;$('#renderTitle').textContent='Your work, ready to show.';$('#renderDescription').textContent=`${screens.length} screen${screens.length===1?'':'s'} · ${duration.toFixed(1)} seconds · ${w} × ${h} · 30 fps`;$('#renderPercent').textContent='100%';$('#renderProgress').value=100;$('#cancelRender').hidden=true;$('#download').hidden=$('#backToEditor').hidden=$('#renderedVideo').hidden=false;$('#renderedVideo').src=outputURL;$('#backToEditor').onclick=()=>{dialog.close();$('#renderedVideo').pause()};dialog.oncancel=null;
}catch(error){console.error(error);dialog.close();notify('Could not finish the video. Please try again in a recent Chrome or Edge.')}finally{cancelAnimationFrame(frameID);document.removeEventListener('visibilitychange',onVisibility);stream?.getTracks().forEach(track=>track.stop());cancelRender=null;rendering=false;document.body.classList.remove('rendering')}};

async function exportGif(){
  if(!screens.length||rendering)return;
  if(typeof Worker==='undefined'){notify('GIF export needs a browser with Web Worker support.');return}
  const [w,h]=outputSize(),duration=totalDuration(),plan=gifFramePlan(screens.length,settings.seconds,settings.fade),dialog=$('#renderDialog');
  let worker,pending,cancelled=false;
  rendering=true;setPlaying(false);position=0;updatePreview();document.body.classList.add('rendering');
  $('#renderTitle').textContent='Creating your GIF.';
  $('#renderDescription').textContent='Encoding full-resolution frames. You can cancel at any time.';
  $('#renderProgress').value=0;$('#renderPercent').textContent='0%';$('#cancelRender').hidden=false;
  $('#download').hidden=$('#backToEditor').hidden=$('#renderedVideo').hidden=$('#renderedGif').hidden=true;
  $('#renderedVideo').pause();$('#renderedVideo').removeAttribute('src');$('#renderedGif').removeAttribute('src');
  dialog.showModal();
  cancelRender=()=>{cancelled=true;worker?.terminate();if(pending){clearTimeout(pending.timer);pending.reject(new DOMException('Cancelled','AbortError'));pending=null}};
  $('#cancelRender').onclick=()=>cancelRender?.();dialog.oncancel=e=>{e.preventDefault();cancelRender?.()};
  try{
    worker=new Worker(new URL('./gif-worker.mjs',import.meta.url),{type:'module'});
    const settle=(error,value)=>{if(!pending)return;const request=pending;pending=null;clearTimeout(request.timer);error?request.reject(error):request.resolve(value)};
    worker.onmessage=e=>{const data=e.data;data.type==='error'?settle(new Error(data.message)):settle(null,data)};
    worker.onerror=e=>{e.preventDefault();settle(new Error(e.message||'GIF encoder failed to load'))};
    const send=(message,transfer=[])=>new Promise((resolve,reject)=>{if(cancelled){reject(new DOMException('Cancelled','AbortError'));return}const timer=setTimeout(()=>settle(new Error('GIF encoding timed out. Please try again.')),120000);pending={resolve,reject,timer};worker.postMessage(message,transfer)});
    await send({type:'init'});
    const out=document.createElement('canvas');out.width=w;out.height=h;const c=out.getContext('2d',{alpha:false,willReadFrequently:true});
    if(!c)throw new Error('Canvas unavailable');
    for(let i=0;i<plan.length;i++){
      const frame=plan[i];draw(c,w,h,frame.time);
      const rgba=c.getImageData(0,0,w,h).data;
      await send({type:'frame',rgba:rgba.buffer,width:w,height:h,delay:frame.delay},[rgba.buffer]);
      position=frame.time;updatePreview();const percent=Math.round((i+1)/plan.length*99);
      $('#renderProgress').value=percent;$('#renderPercent').textContent=percent+'%';
    }
    const result=await send({type:'finish'});if(cancelled)return;
    const blob=new Blob([result.buffer],{type:'image/gif'});
    if(outputURL)URL.revokeObjectURL(outputURL);outputURL=URL.createObjectURL(blob);
    $('#download').href=outputURL;$('#download').download=`folio-showreel-${w}x${h}.gif`;
    $('#download').textContent=`Download GIF · ${(blob.size/1024/1024).toFixed(1)} MB`;
    $('#renderTitle').textContent='Your GIF is ready.';
    $('#renderDescription').textContent=`${screens.length} screen${screens.length===1?'':'s'} · ${duration.toFixed(1)} seconds · ${w} × ${h} · looping`;
    $('#renderPercent').textContent='100%';$('#renderProgress').value=100;$('#cancelRender').hidden=true;
    $('#download').hidden=$('#backToEditor').hidden=$('#renderedGif').hidden=false;$('#renderedGif').src=outputURL;
    $('#backToEditor').onclick=()=>dialog.close();dialog.oncancel=null;position=duration;updatePreview();
  }catch(error){dialog.close();if(cancelled)notify('GIF export cancelled.');else{console.error(error);notify('GIF export failed. '+error.message)}}
  finally{worker?.terminate();if(pending)clearTimeout(pending.timer);cancelRender=null;rendering=false;document.body.classList.remove('rendering')}
}
$('#export').onclick=async()=>{await ready;if(rendering||!screens.length)return;settings.format==='gif'?await exportGif():await exportVideo()};
