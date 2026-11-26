import {mountColorPicker} from './color-picker.mjs?v=07e3a5ca3d';
import {gifFramePlan} from './gif-plan.mjs';
import {sortByFilename,moveSource} from './source-order.mjs';
import {resolveSize,sizeError,previewDimensions,renderComposition,GRADIENTS} from './composition.mjs?v=e5684a3a7b';
'use strict';
const $=s=>document.querySelector(s);
// Text fields can match :focus-visible after a click; rings follow Tab navigation only.
document.addEventListener('keydown',event=>{if(event.key==='Tab')document.documentElement.dataset.keyboardFocus=''},true);
document.addEventListener('pointerdown',()=>{delete document.documentElement.dataset.keyboardFocus},true);
const FPS=30,MAX_IMAGES=12;
const DEFAULTS={seconds:.6,fade:.48,feel:'soft',format:'gif',orderMode:'name',background:'none',solidColor:'#fefefe',gradient:0,backgroundPreset:null,padding:8,radius:0,projectName:'Name of file',sizeMode:'source',width:null,height:null,sizeSourceId:null};
let screens=[],settings={...DEFAULTS},backgroundAsset=null,pendingSizeError='',playing=false,position=0,lastFrame=0,db=null,saveTimer,outputURL=null,rendering=false,cancelRender=null;
const canvas=$('#preview'),context=canvas.getContext('2d',{alpha:true});
const numberMeasure=document.createElement('canvas').getContext('2d');
const colorPicker=mountColorPicker($('#pickColor'),$('#colorPicker'),setSolidColor);
let presetRequest=0,presetLoading=false;
const presetCache=new Map();
const totalDuration=()=>screens.length*settings.seconds;
function outputSize(){return resolveSize(screens,settings)}
function formatTime(t){const tenths=Math.round(t*10),minutes=Math.floor(tenths/600),seconds=(tenths%600)/10;return `${String(minutes).padStart(2,'0')}:${seconds.toFixed(1).padStart(4,'0')}`}
function notify(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('#toast').classList.remove('visible'),4500)}
function setError(message){$('#uploadError').textContent=message;$('#uploadError').hidden=!message}
function setPlaying(value){playing=value;if(value)$('#play').innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pause preview-icon" aria-hidden="true"><rect x="14" y="3" width="5" height="18" rx="1"/><rect x="5" y="3" width="5" height="18" rx="1"/></svg>';else $('#play').replaceChildren(assetIcon('35-1990-imgFrame2'));$('#play').setAttribute('aria-label',value?'Pause preview':'Play preview')}
const ICONS={'35-1990-imgFrame2':'play','35-1990-imgFrame3':'restart','35-547-imgFrame1':'35-547-imgFrame2','35-3052-imgDefault':'remove','35-3052-imgHover':'remove-hover'};
function assetIcon(name,className='figma-icon'){const image=document.createElement('img');image.src=`assets/reelo/${ICONS[name]||name}.svg`;image.alt='';image.className=className;image.draggable=false;return image}
function updateRange(input){const percentage=(Number(input.value)-Number(input.min))/(Number(input.max)-Number(input.min))*100;input.style.setProperty('--progress',Math.max(0,Math.min(100,percentage))+'%');if(input.id==='scrubber')input.parentElement.style.setProperty('--progress',Math.max(0,Math.min(100,percentage))+'%')}
function downloadName(extension){return (settings.projectName||'Reelo showreel').replace(/[<>:"/\\|?*\x00-\x1f]/g,'').trim().slice(0,80)+'.'+extension}
function updateCompositionSize(bytes){$('#compositionSize').textContent='Comp size: '+(bytes/1024/1024).toFixed(1)+' MB'}
function draw(c,w,h,t){renderComposition(c,w,h,t,screens,settings,backgroundAsset)}
function updatePreview(){
  if(!screens.length)return;const [w,h]=outputSize();if(sizeError(w,h))return;
  const well=$('.canvas-well'),aw=Math.max(1,well.clientWidth-8),ah=Math.max(1,well.clientHeight-8),scale=Math.min(1,aw/w,ah/h);
  const [pw,ph]=previewDimensions(w,h,aw,ah,window.devicePixelRatio||1);
  canvas.style.width=w*scale+'px';canvas.style.height=h*scale+'px';
  if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph}
  draw(context,pw,ph,position);$('#currentTime').textContent=formatTime(position);$('#scrubber').value=position;updateRange($('#scrubber'));
  const index=Math.min(screens.length-1,Math.floor(position/settings.seconds));$('#previewStatus').textContent=`Screen ${index+1} of ${screens.length}`;
}
new ResizeObserver(()=>updatePreview()).observe($('.canvas-well'));
window.addEventListener('resize',()=>updatePreview());
function frame(now){if(lastFrame&&playing&&!rendering){position=Math.min(totalDuration(),position+(now-lastFrame)/1000);if(position>=totalDuration())setPlaying(false)}lastFrame=now;if(playing)updatePreview();requestAnimationFrame(frame)}
function sync(){
  const has=screens.length>0,total=totalDuration(),[w,h]=outputSize();
  document.body.classList.toggle('has-screens',has);
  $('#preview').hidden=!has;$('#emptyPreview').hidden=has;
  for(const id of ['play','restart','scrubber','export'])$('#'+id).disabled=!has||Boolean(pendingSizeError||sizeError(w,h));
  if(presetLoading&&settings.background==='image')$('#export').disabled=true;
  $('#clearAll').hidden=!has;
  $('#durationLabel').textContent=formatTime(total);$('#scrubber').max=total||1;
  position=Math.min(position,total);$('#currentTime').textContent=formatTime(position);$('#scrubber').value=position;
  $('#resolutionLabel').textContent=$('#canvasSize').textContent=$('#resolutionPill').textContent=has?`${w} × ${h}`:'Source size';
  $('#aspectRatio').textContent=settings.sizeMode==='custom'?'Custom':'Source';
  syncCompositionControls(w,h);
  $('#exportMeta').textContent=has?`${total.toFixed(1)} seconds · ${w} × ${h} · ${settings.format.toUpperCase()}`:'Add a screen to get started';
  $('#exportFormat').value=settings.format;
  $('#formatHint').textContent=settings.format==='png'?'Full-resolution PNG · current preview frame':settings.format==='gif'?(settings.background==='none'?'Transparent GIF · 20 fps transitions':'Looping · 20 fps transitions · 256 colors'):(w%2||h%2?'30 fps · WebM keeps your exact dimensions':'30 fps · MP4 where supported');
  $('#screenDurationRange').value=settings.seconds;
  $('#transitionLabel').textContent=settings.feel;
  document.querySelectorAll('[data-feel]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.feel===settings.feel)));
  $('#feelDescription').textContent=settings.feel==='stiff'?'A sharper switch with a direct dissolve.':'Gentle easing through the full transition.';
  $('#perScreenLabel').textContent=Number(settings.seconds.toFixed(2))+'s';$('#screenDuration').value=Number(settings.seconds.toFixed(3));
  $('#totalDuration').value=Number(total.toFixed(2));$('#totalDuration').disabled=!has;$('#totalDuration').min=screens.length*.1;$('#totalDuration').max=screens.length*10;
  $('#timingCount').textContent=screens.length+(screens.length===1?' screen':' screens');
  $('#projectName').value=settings.projectName;$('#projectName').style.width=Math.min(238,Math.max(26,settings.projectName.length*7.3))+'px';
  $('#projectExtension').textContent='.'+(settings.format==='video'?'mp4':settings.format);
  for(const key of ['padding','radius']){$('#'+key).value=settings[key];$('#'+key+'Range').value=settings[key]}
  document.querySelectorAll('.number-unit input').forEach(input=>{numberMeasure.font=getComputedStyle(input).font;input.style.width=Math.ceil(numberMeasure.measureText(input.value||'0').width+12)+'px'});
  document.querySelectorAll('input[type=range]').forEach(updateRange);
  updateCompositionSize(screens.reduce((sum,screen)=>sum+screen.blob.size,0)+(backgroundAsset?.blob.size||0));
  if(!has){$('#previewStatus').textContent='Waiting for your first screen';setPlaying(false)}
  updatePreview();renderList();
}
function renderList(){
  const list=$('#imageList'),focused=document.activeElement.closest?.('.image-item'),focusIndex=focused?.dataset.index,focusClass=document.activeElement.dataset.action;
  list.replaceChildren();
  screens.forEach((screen,index)=>{
    const row=document.createElement('div');row.className='image-item';row.dataset.index=index;row.setAttribute('role','listitem');row.setAttribute('aria-label',`${index+1}. ${screen.name}`);
    const handle=document.createElement('button');handle.className='drag-handle';handle.type='button';handle.dataset.action='drag';
    handle.setAttribute('aria-label',`Reorder ${screen.name}`);handle.title='Drag to reorder, or use the up and down arrow keys';handle.append(assetIcon('35-547-imgFrame1'));
    handle.onkeydown=e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();reorderScreen(index,index+(e.key==='ArrowUp'?-1:1),true)}};
    row.onpointerdown=e=>startSourceDrag(e,row,index);
    const img=document.createElement('img');img.className='source-thumb';img.src=screen.url;img.alt='';img.draggable=false;
    const info=document.createElement('div');info.className='image-info';
    const name=document.createElement('span');name.className='image-name';name.textContent=screen.name;name.title=`${index+1}. ${screen.name}`;
    const size=document.createElement('span');size.className='image-size';size.textContent=`${screen.width} × ${screen.height}`;info.append(name,size);
    const remove=document.createElement('button');remove.className='remove-image';remove.dataset.action='remove';remove.setAttribute('aria-label',`Remove ${screen.name}`);
    remove.append(assetIcon('35-3052-imgDefault','figma-icon default-remove'),assetIcon('35-3052-imgHover','figma-icon hover-remove'));
    remove.onclick=()=>{setPlaying(false);screens.splice(index,1);URL.revokeObjectURL(screen.url);ensureSizeSource();position=0;sync();save();$('#imageList').children[Math.min(index,screens.length-1)]?.querySelector('.remove-image')?.focus()};
    row.append(handle,img,info,remove);list.append(row);
  });
  if(focusIndex!==undefined&&focusClass)list.children[focusIndex]?.querySelector(`[data-action="${focusClass}"]`)?.focus({preventScroll:true});
}
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
  const list=$('#imageList'),box=$('.inspector').getBoundingClientRect(),rows=[...list.children];let best=null,bestDistance=Infinity;
  for(const row of rows){row.classList.remove('drop-before','drop-after');const rect=row.getBoundingClientRect();if(rect.bottom<box.top||rect.top>box.bottom)continue;const dx=d.x-Math.max(rect.left,Math.min(rect.right,d.x)),dy=d.y-Math.max(rect.top,Math.min(rect.bottom,d.y)),distance=dx*dx+dy*dy;if(distance<bestDistance){best=row;bestDistance=distance}}
  if(!best)return;
  const rect=best.getBoundingClientRect(),after=d.y>rect.top+rect.height/2;
  d.insert=Number(best.dataset.index)+(after?1:0);
  const to=d.insert>d.from?d.insert-1:d.insert;
  if(to!==d.from)best.classList.add(after?'drop-after':'drop-before');
}
function sourceDragTick(){
  const d=sourceDrag;if(!d?.active)return;
  const scroller=$('.inspector'),rect=scroller.getBoundingClientRect();
  if(d.y<rect.top+30)scroller.scrollTop-=Math.min(12,(rect.top+30-d.y)/3);
  else if(d.y>rect.bottom-30)scroller.scrollTop+=Math.min(12,(d.y-rect.bottom+30)/3);
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
async function decodeAsset(blob,name,id=crypto.randomUUID()){
  const url=URL.createObjectURL(blob);
  try{const image=await imageFromURL(url);if(!image.naturalWidth||!image.naturalHeight)throw new Error('Empty image');return {id,name,blob,url,image,width:image.naturalWidth,height:image.naturalHeight,sourceVersion:2}}catch(e){URL.revokeObjectURL(url);throw e}
}
async function acceptFiles(fileList){await ready;setError('');const files=sortByFilename([...fileList]);if(screens.length>=MAX_IMAGES){setError('Your showreel already has 12 screens. Remove one to add another.');return}let errors=[],added=0;for(const file of files){if(screens.length>=MAX_IMAGES){errors.push('Only the first 12 valid screens were added.');break}if(!['image/png','image/jpeg','image/webp','image/svg+xml'].includes(file.type)){errors.push(`${file.name}: use PNG, JPG, WebP or SVG.`);continue}if(file.size>40*1024*1024){errors.push(`${file.name}: please keep each image under 40 MB.`);continue}const url=URL.createObjectURL(file);try{const image=await imageFromURL(url),w=image.naturalWidth,h=image.naturalHeight;if(!w||!h)throw new Error('Empty image');screens.push({id:crypto.randomUUID(),name:file.name,blob:file,url,image,width:w,height:h,sourceVersion:2});added++}catch{URL.revokeObjectURL(url);errors.push(`${file.name} could not be opened. Try exporting it again.`)}}$('#files').value='';if(added){if(settings.orderMode==='name')screens=sortByFilename(screens);ensureSizeSource();position=0;sync();save();setPlaying(!matchMedia('(prefers-reduced-motion: reduce)').matches);notify(`${added} screen${added===1?'':'s'} added. Your ${totalDuration().toFixed(1)}-second showreel is ready to preview.`)}setError(errors.join(' '))}
function syncCompositionControls(width,height){
  const has=screens.length>0,showSize=has||settings.sizeMode==='custom';
  if(!pendingSizeError){$('#canvasWidth').value=showSize?width:'';$('#canvasHeight').value=showSize?height:''}
  const error=pendingSizeError||(has?sizeError(width,height):'');$('#sizeError').textContent=error;$('#sizeError').hidden=!error;
  $('#matchSource').disabled=!has;const select=$('#sizeSource');select.replaceChildren();
  if(!has){const option=document.createElement('option');option.value='';option.textContent='Upload a screen first';select.append(option)}
  for(const screen of screens){const option=document.createElement('option');option.value=screen.id;option.textContent=screen.name;select.append(option)}
  select.disabled=!has;select.value=settings.sizeSourceId||'';
  const source=screens.find(screen=>screen.id===settings.sizeSourceId)||screens[0];
  $('#sizeModeLabel').textContent=settings.sizeMode==='custom'?'Custom canvas':source?'Matches selected source':'Uses your image’s original dimensions';
  const legacy=screens.some(screen=>screen.sourceVersion!==2);$('#legacyHint').hidden=!legacy;
  const selectedMode=['light','dark'].includes(settings.background)?'solid':settings.background==='gradient'?'image':settings.background;
  document.querySelectorAll('[data-background]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.background===selectedMode)));
  $('#transparentOptions').hidden=selectedMode!=='none';$('#imageBackgroundOptions').hidden=selectedMode!=='image';$('#solidOptions').hidden=selectedMode!=='solid';
  const color=settings.background==='dark'?'#0e0e0e':settings.background==='light'?'#fefefe':settings.solidColor;
  colorPicker.setColor(color);
  document.querySelectorAll('[data-color]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.color.toLowerCase()===color.toLowerCase())));
  document.querySelectorAll('[data-preset]').forEach(button=>button.setAttribute('aria-pressed',String(selectedMode==='image'&&Number(button.dataset.preset)===settings.backgroundPreset)));
  $('[data-transparent]').setAttribute('aria-pressed',String(selectedMode==='none'));
  $('#uploadBackground').setAttribute('aria-pressed',String(selectedMode==='image'&&Boolean(backgroundAsset)&&!Number.isInteger(settings.backgroundPreset)));
  $('#pickColor').setAttribute('aria-pressed',String(selectedMode==='solid'&&![...document.querySelectorAll('[data-color]')].some(button=>button.dataset.color.toLowerCase()===color.toLowerCase())));
  document.querySelectorAll('[data-ratio]').forEach(button=>{const [rw,rh]=button.dataset.ratio.split(':').map(Number);button.setAttribute('aria-pressed',String(settings.sizeMode==='custom'&&Math.abs(width/height-rw/rh)<.002))});
  $('#backgroundHint').hidden=true;
  $('#exportFormat').querySelector('option[value="video"]').disabled=settings.background==='none';
}
async function commitSize(){
  const width=Number($('#canvasWidth').value),height=Number($('#canvasHeight').value);await ready;
  pendingSizeError=sizeError(width,height);
  if(pendingSizeError){$('#sizeError').textContent=pendingSizeError;$('#sizeError').hidden=false;$('#export').disabled=true;return}
  settings.sizeMode='custom';settings.width=width;settings.height=height;sync();save();
}
async function uploadBackground(file){
  await ready;if(!file)return;
  if(!['image/png','image/jpeg','image/webp','image/svg+xml'].includes(file.type)||file.size>40*1024*1024){notify('Use a PNG, JPG, WebP or SVG background smaller than 40 MB.');return}
  try{const asset=await decodeAsset(file,file.name);if(backgroundAsset&&!backgroundAsset.preset)URL.revokeObjectURL(backgroundAsset.url);backgroundAsset=asset;settings.backgroundPreset=null;settings.background='image';sync();save()}
  catch{notify('Could not open this background image. Please try another file.')}
  $('#backgroundFile').value='';
}
$('#canvasWidth').onchange=$('#canvasHeight').onchange=commitSize;
$('#sizeSource').onchange=async e=>{const id=e.target.value;await ready;settings.sizeSourceId=id;settings.sizeMode='source';pendingSizeError='';sync();save()};
$('#matchSource').onclick=async()=>{await ready;settings.sizeMode='source';pendingSizeError='';ensureSizeSource();sync();save()};
document.querySelectorAll('[data-background]').forEach(button=>button.onclick=async()=>{
  await ready;presetRequest++;presetLoading=false;settings.background=button.dataset.background;
  if(settings.background==='none'&&settings.format==='video')settings.format='gif';
  sync();
  if(settings.background==='image'&&!backgroundAsset){await choosePreset([7,8,9,10,12,11].includes(settings.backgroundPreset)?settings.backgroundPreset:7);return}
  sync();save();
});
$('#uploadBackground').onclick=()=>$('#backgroundFile').click();
$('#backgroundFile').onchange=e=>{presetRequest++;const file=e.target.files[0];e.target.value='';uploadBackground(file)};
$('[data-transparent]').onclick=async()=>{await ready;presetRequest++;presetLoading=false;settings.background='none';if(settings.format==='video')settings.format='gif';sync();save()};
function presetAsset(index){
  if(presetCache.has(index))return presetCache.get(index);
  const pending=(async()=>{
    const formats=index===7?['avif','webp']:['webp'];
    for(const format of formats){try{const response=await fetch(`assets/reelo/preset-${index}.${format}`);if(!response.ok)throw new Error('Background unavailable');const asset=await decodeAsset(await response.blob(),`Background ${[7,8,9,10,12,11].indexOf(index)+1}`);asset.preset=true;return asset}catch(error){if(format===formats.at(-1))throw error}}
  })();
  presetCache.set(index,pending);
  pending.catch(()=>{if(presetCache.get(index)===pending)presetCache.delete(index)});
  return pending;
}
async function choosePreset(index){
  await ready;const request=++presetRequest;
  const previousPreset=settings.backgroundPreset;presetLoading=true;settings.backgroundPreset=index;settings.background='image';sync();
  try{const asset=await presetAsset(index);if(request!==presetRequest)return;if(backgroundAsset&&!backgroundAsset.preset)URL.revokeObjectURL(backgroundAsset.url);backgroundAsset=asset;presetLoading=false;settings.backgroundPreset=index;settings.background='image';sync();save()}
  catch{if(request!==presetRequest)return;presetLoading=false;settings.backgroundPreset=previousPreset;if(!backgroundAsset)settings.background='none';sync();notify('Could not load the background. Please try again.')}
}
document.querySelectorAll('[data-preset]').forEach(button=>{
  const warm=()=>presetAsset(Number(button.dataset.preset)).catch(()=>{});
  button.onpointerenter=button.onfocus=warm;
  button.onclick=()=>choosePreset(Number(button.dataset.preset));
});
const imageModeButton=$('[data-background="image"]');
imageModeButton.onpointerenter=imageModeButton.onfocus=()=>presetAsset(settings.backgroundPreset??7).catch(()=>{});
function setSolidColor(color){
  presetRequest++;presetLoading=false;settings.background='solid';settings.solidColor=color;
  colorPicker.setColor(color);document.querySelectorAll('[data-color]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.color.toLowerCase()===color.toLowerCase())));
  $('#pickColor').setAttribute('aria-pressed',String(![...document.querySelectorAll('[data-color]')].some(button=>button.dataset.color.toLowerCase()===color.toLowerCase())));
  updatePreview();save();
}

function ensureSizeSource(){if(!screens.some(screen=>screen.id===settings.sizeSourceId))settings.sizeSourceId=screens[0]?.id||null}
async function init(){
  try{
    db=await new Promise((resolve,reject)=>{const request=indexedDB.open('folio-showreel',1);request.onupgradeneeded=()=>request.result.createObjectStore('projects');request.onsuccess=()=>resolve(request.result);request.onerror=reject});
    const stored=await new Promise((resolve,reject)=>{const request=db.transaction('projects').objectStore('projects').get('current');request.onsuccess=()=>resolve(request.result);request.onerror=reject});
    if(stored){
      settings={...DEFAULTS,...stored.settings};
      settings.padding=Math.max(0,Math.min(80,Number(settings.padding)||0));settings.radius=Math.max(0,Math.min(100,Number(settings.radius)||0));settings.gradient=Math.max(0,Math.min(GRADIENTS.length-1,Math.round(Number(settings.gradient)||0)));
      if(!/^#[0-9a-f]{6}$/i.test(settings.solidColor))settings.solidColor='#fefefe';settings.projectName=String(settings.projectName||'Name of file').slice(0,80);
      if(!['soft','stiff'].includes(settings.feel))settings.feel='soft';if(!['video','gif','png'].includes(settings.format))settings.format='video';if(!['name','custom'].includes(settings.orderMode))settings.orderMode='name';
      if(!['light','dark','none','image','solid','gradient'].includes(settings.background))settings.background='light';if(!['source','custom'].includes(settings.sizeMode))settings.sizeMode='source';
      settings.seconds=Math.max(.1,Math.min(10,Number(settings.seconds)||1.5));settings.fade=Math.max(.02,Math.min(3,settings.seconds*.8,Number(settings.fade)||.5));
      for(const entry of stored.screens.slice(0,MAX_IMAGES)){try{const asset=await decodeAsset(entry.blob,entry.name,entry.id);asset.sourceVersion=entry.sourceVersion||1;screens.push(asset)}catch{}}
      if(settings.background==='image'&&Number.isInteger(settings.backgroundPreset)&&[7,8,9,10,12,11].includes(settings.backgroundPreset)){try{backgroundAsset=await presetAsset(settings.backgroundPreset)}catch{settings.background='none'}}
      if(stored.background){try{backgroundAsset=await decodeAsset(stored.background.blob,stored.background.name)}catch{settings.background='light'}}
      if(settings.background==='image'&&!backgroundAsset)settings.background='none';if(settings.background==='none'&&settings.format==='video')settings.format='gif';
      if(settings.orderMode==='name')screens=sortByFilename(screens);ensureSizeSource();
    }
    sync();
  }catch{$('#saveStatus').textContent='Device storage unavailable · this session only'}
}
function save(){clearTimeout(saveTimer);$('#saveStatus').textContent='Saving on this device…';saveTimer=setTimeout(()=>{if(!db){$('#saveStatus').textContent='This session only';return}try{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put({version:2,settings,background:backgroundAsset&&settings.backgroundPreset===null?{name:backgroundAsset.name,blob:backgroundAsset.blob}:null,screens:screens.map(({id,name,width,height,blob,sourceVersion})=>({id,name,width,height,blob,sourceVersion}))},'current');tx.oncomplete=()=>$('#saveStatus').textContent='Saved automatically on this device';tx.onerror=()=>{$('#saveStatus').textContent='Could not save · keep this tab open';notify('Device storage is full. You can still create and download your video.')}}catch{$('#saveStatus').textContent='Could not save · keep this tab open'}},200)}
const ready=init();document.fonts.ready.then(()=>ready).then(()=>sync());requestAnimationFrame(frame);
$('#addSources').onclick=$('#upload').onclick=$('#emptyUpload').onclick=()=>$('#files').click();$('#files').onchange=e=>acceptFiles(e.target.files);for(const area of [$('.source-panel'),$('#dropStage')]){area.ondragover=e=>{e.preventDefault();area.classList.add('dragover')};area.ondragleave=()=>area.classList.remove('dragover');area.ondrop=e=>{e.preventDefault();area.classList.remove('dragover');if(!rendering)acceptFiles(e.dataTransfer.files)}}
$('#clearAll').onclick=()=>{screens.forEach(s=>URL.revokeObjectURL(s.url));screens=[];settings.orderMode='name';settings.sizeSourceId=null;pendingSizeError='';position=0;setError('');sync();save()};$('#play').onclick=()=>{if(position>=totalDuration())position=0;setPlaying(!playing);updatePreview()};$('#restart').onclick=()=>{position=0;setPlaying(true);updatePreview()};$('#scrubber').oninput=e=>{position=Number(e.target.value);setPlaying(false);updatePreview()};function timingChanged(){position=0;setPlaying(false);settings.fade=Math.min(settings.fade,settings.seconds*.8);sync();save()}
$('#screenDuration').onchange=async e=>{const v=Number(e.target.value);await ready;settings.seconds=Math.min(10,Math.max(.1,Number.isFinite(v)&&v>0?v:1.5));timingChanged()};
$('#totalDuration').onchange=async e=>{const v=Number(e.target.value);await ready;if(!screens.length)return;settings.seconds=Math.min(10,Math.max(.1,(Number.isFinite(v)&&v>0?v:totalDuration())/screens.length));timingChanged()};
document.querySelectorAll('[data-feel]').forEach(button=>button.onclick=async()=>{await ready;settings.feel=button.dataset.feel;sync();save()});
$('#exportFormat').onchange=async e=>{const value=e.target.value;await ready;settings.format=settings.background==='none'&&value==='video'?'gif':value;sync();save()};
$('#screenDurationRange').oninput=async e=>{const v=Number(e.target.value);await ready;settings.seconds=v;timingChanged()};
$('#resetTiming').onclick=async()=>{await ready;settings.seconds=DEFAULTS.seconds;timingChanged()};
$('#resetTransition').onclick=async()=>{await ready;settings.feel='soft';settings.fade=Math.min(.5,settings.seconds*.8);sync();save()};
$('#resetSettings').onclick=async()=>{await ready;presetRequest++;presetLoading=false;if(backgroundAsset&&!backgroundAsset.preset)URL.revokeObjectURL(backgroundAsset.url);backgroundAsset=null;settings={...DEFAULTS,orderMode:settings.orderMode,sizeSourceId:screens[0]?.id||null};pendingSizeError='';position=0;setPlaying(false);sync();save();notify('Settings reset. Your screens are kept.')};
$('#guideButton').onclick=()=>$('#guide').showModal();$('#guide .close').onclick=()=>$('#guide').close();
// MediaRecorder streams WebM without a Duration entry. Add it so players can seek
// and show the correct length. Segment size in streamed WebM is unspecified.
async function addWebmDuration(blob,duration){const bytes=new Uint8Array(await blob.arrayBuffer());function read(offset,id=false){if(offset>=bytes.length)return null;let mask=128,n=1;while(n<=8&&!(bytes[offset]&mask)){mask>>=1;n++}if(n>8||offset+n>bytes.length)return null;let value=id?bytes[offset]:bytes[offset]&(mask-1);for(let i=1;i<n;i++)value=value*256+bytes[offset+i];return {value,n}}
function encodeSize(value,n){if(value>=2**(7*n)-1)return null;const b=new Uint8Array(n);let v=value;for(let i=n-1;i>=0;i--){b[i]=v%256;v=Math.floor(v/256)}b[0]|=1<<(8-n);return b}
let offset=0,segment=null;while(offset<bytes.length){const id=read(offset,true);if(!id)break;const size=read(offset+id.n);if(!size)break;const start=offset+id.n+size.n;if(id.value===0x18538067){segment={start,size,offset:offset+id.n};break}offset=start+size.value}if(!segment)return blob;offset=segment.start;while(offset<bytes.length){const id=read(offset,true),size=id&&read(offset+id.n);if(!id||!size)break;const start=offset+id.n+size.n,end=start+size.value;if(end>bytes.length)break;if(id.value===0x1549a966){let scale=1000000,child=start;while(child<end){const cid=read(child,true),cs=cid&&read(child+cid.n);if(!cid||!cs)return blob;const pos=child+cid.n+cs.n;if(cid.value===0x4489)return blob;if(cid.value===0x2ad7b1){scale=0;for(let k=0;k<cs.value;k++)scale=scale*256+bytes[pos+k]}child=pos+cs.value}const newSize=encodeSize(size.value+11,size.n);if(!newSize)return blob;const durationEntry=new Uint8Array(11);durationEntry.set([0x44,0x89,0x88]);new DataView(durationEntry.buffer).setFloat64(3,duration*1e9/scale,false);const result=new Uint8Array(bytes.length+11);result.set(bytes.slice(0,offset+id.n));result.set(newSize,offset+id.n);result.set(bytes.slice(start,end),start);result.set(durationEntry,end);result.set(bytes.slice(end),end+11);return new Blob([result],{type:blob.type})}offset=end}return blob}
async function exportVideo(){await ready;if(!screens.length||rendering)return;const [w,h]=outputSize();if(typeof MediaRecorder==='undefined'||!canvas.captureStream){notify('Video export is not supported in this browser. Please use a recent Chrome, Edge, or Safari.');return}const mime=(w%2||h%2?['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm']:['video/mp4;codecs=avc1.420033','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm']).find(m=>MediaRecorder.isTypeSupported(m));if(!mime){notify('This browser cannot encode video. Please try a recent Chrome or Edge.');return}let recorder,stream,frameID,cancelled=false,hidden=false;const dialog=$('#renderDialog'),duration=totalDuration();setPlaying(false);position=0;updatePreview();rendering=true;document.body.classList.add('rendering');$('#renderTitle').textContent='Creating your showreel.';$('#renderDescription').textContent='Keep this tab visible while your video renders.';$('#renderProgress').value=0;$('#renderPercent').textContent='0%';$('#cancelRender').hidden=false;$('#download').hidden=$('#backToEditor').hidden=$('#renderedVideo').hidden=$('#renderedGif').hidden=true;$('#renderedGif').removeAttribute('src');$('#renderedVideo').pause();$('#renderedVideo').removeAttribute('src');dialog.showModal();cancelRender=()=>{cancelled=true;cancelAnimationFrame(frameID);if(recorder&&recorder.state!=='inactive')recorder.stop()};$('#cancelRender').onclick=()=>cancelRender?.();dialog.oncancel=e=>{e.preventDefault();cancelRender?.()};const onVisibility=()=>{if(document.hidden){hidden=true;cancelRender?.()}};document.addEventListener('visibilitychange',onVisibility);
try{const out=document.createElement('canvas');out.width=w;out.height=h;const c=out.getContext('2d',{alpha:false});if(!c||out.width!==w||out.height!==h)throw new Error('Unsupported canvas size');draw(c,w,h,0);stream=out.captureStream(FPS);const bitrate=Math.min(60_000_000,Math.max(10_000_000,Math.round(w*h*FPS*.18)));recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:bitrate});const chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};const stopped=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=e=>reject(e.error||new Error('Video encoder error'))});recorder.start(200);const start=performance.now();const tick=now=>{const t=Math.min(duration,(now-start)/1000);draw(c,w,h,Math.min(t,duration-.001));position=t;updatePreview();const pct=Math.min(100,Math.round(t/duration*100));$('#renderProgress').value=pct;$('#renderPercent').textContent=pct+'%';if(t<duration&&!cancelled)frameID=requestAnimationFrame(tick);else if(recorder.state!=='inactive')recorder.stop()};frameID=requestAnimationFrame(tick);await stopped;if(cancelled){dialog.close();notify(hidden?'Rendering stopped because the tab was hidden. Keep it visible and try again.':'Video creation cancelled.');return}if(!chunks.length)throw new Error('No video frames');let blob=new Blob(chunks,{type:recorder.mimeType||mime});if(mime.includes('webm')){try{blob=await addWebmDuration(blob,duration)}catch{}}if(outputURL)URL.revokeObjectURL(outputURL);outputURL=URL.createObjectURL(blob);const ext=mime.includes('mp4')?'mp4':'webm';updateCompositionSize(blob.size);$('#download').href=outputURL;$('#download').download=downloadName(ext);$('#download').textContent=`Download ${ext.toUpperCase()} · ${(blob.size/1024/1024).toFixed(1)} MB`;$('#renderTitle').textContent='Your work, ready to show.';$('#renderDescription').textContent=`${screens.length} screen${screens.length===1?'':'s'} · ${duration.toFixed(1)} seconds · ${w} × ${h} · 30 fps`;$('#renderPercent').textContent='100%';$('#renderProgress').value=100;$('#cancelRender').hidden=true;$('#download').hidden=$('#backToEditor').hidden=$('#renderedVideo').hidden=false;$('#renderedVideo').src=outputURL;$('#backToEditor').onclick=()=>{dialog.close();$('#renderedVideo').pause()};dialog.oncancel=null;
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
    await send({type:'init',transparent:settings.background==='none'});
    const out=document.createElement('canvas');out.width=w;out.height=h;const c=out.getContext('2d',{alpha:true,willReadFrequently:true});
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
    updateCompositionSize(blob.size);$('#download').href=outputURL;$('#download').download=downloadName('gif');
    $('#download').textContent=`Download GIF · ${(blob.size/1024/1024).toFixed(1)} MB`;
    $('#renderTitle').textContent='Your GIF is ready.';
    $('#renderDescription').textContent=`${screens.length} screen${screens.length===1?'':'s'} · ${duration.toFixed(1)} seconds · ${w} × ${h} · looping`;
    $('#renderPercent').textContent='100%';$('#renderProgress').value=100;$('#cancelRender').hidden=true;
    $('#download').hidden=$('#backToEditor').hidden=$('#renderedGif').hidden=false;$('#renderedGif').alt='Rendered animated GIF showreel';$('#renderedGif').src=outputURL;
    $('#backToEditor').onclick=()=>dialog.close();dialog.oncancel=null;position=duration;updatePreview();
  }catch(error){dialog.close();if(cancelled)notify('GIF export cancelled.');else{console.error(error);notify('GIF export failed. '+error.message)}}
  finally{worker?.terminate();if(pending)clearTimeout(pending.timer);cancelRender=null;rendering=false;document.body.classList.remove('rendering')}
}
$('#export').onclick=async()=>{await ready;if(rendering||!screens.length)return;const error=pendingSizeError||sizeError(...outputSize());if(error){notify(error);return}settings.format==='png'?await exportPng():settings.format==='gif'?await exportGif():await exportVideo()};

// The sidebar presents the same composition settings used by every export path.
$('#projectName').onchange=async event=>{const value=event.target.value.trim().replace(/\.(mp4|webm|gif|png)$/i,'');await ready;settings.projectName=value||'Name of file';sync();save()};
$('#projectName').onkeydown=event=>{if(event.key==='Enter')event.target.blur()};
for(const key of ['padding','radius'])for(const suffix of ['', 'Range']){
  $('#'+key+suffix).addEventListener(suffix?'input':'change',async event=>{const value=Number(event.target.value);await ready;settings[key]=Math.max(0,Math.min(key==='padding'?80:100,Number.isFinite(value)?value:0));sync();save()});
}
document.querySelectorAll('[data-ratio]').forEach(button=>button.onclick=async()=>{
  await ready;const [rw,rh]=button.dataset.ratio.split(':').map(Number),[w,h]=outputSize(),long=Math.max(w,h),unit=long/Math.max(rw,rh);
  const width=Math.max(1,Math.round(rw*unit)),height=Math.max(1,Math.round(rh*unit));
  const error=sizeError(width,height);if(error){notify(error);return}
  settings.sizeMode='custom';settings.width=width;settings.height=height;pendingSizeError='';sync();save();
});
document.querySelectorAll('[data-color]').forEach(button=>button.onclick=async()=>{await ready;settings.background='solid';setSolidColor(button.dataset.color);sync();save()});
async function exportPng(){
  if(!screens.length||rendering)return;setPlaying(false);rendering=true;
  try{
    const [w,h]=outputSize(),out=document.createElement('canvas');out.width=w;out.height=h;draw(out.getContext('2d',{alpha:true}),w,h,position);
    const blob=await new Promise((resolve,reject)=>out.toBlob(value=>value?resolve(value):reject(new Error('PNG encoding failed')),'image/png'));
    if(outputURL)URL.revokeObjectURL(outputURL);outputURL=URL.createObjectURL(blob);updateCompositionSize(blob.size);
    $('#download').href=outputURL;$('#download').download=downloadName('png');$('#download').textContent=`Download PNG · ${(blob.size/1024/1024).toFixed(1)} MB`;
    $('#renderTitle').textContent='Your PNG is ready.';$('#renderDescription').textContent=`Current preview frame · ${w} × ${h}`;
    $('#renderProgress').value=100;$('#renderPercent').textContent='100%';$('#cancelRender').hidden=true;$('#renderedVideo').hidden=true;$('#renderedVideo').pause();
    $('#download').hidden=$('#backToEditor').hidden=$('#renderedGif').hidden=false;$('#renderedGif').alt='Exported composition frame';$('#renderedGif').src=outputURL;
    $('#backToEditor').onclick=()=>$('#renderDialog').close();$('#renderDialog').oncancel=null;$('#renderDialog').showModal();
  }catch(error){console.error(error);notify('Could not export the PNG. Please try again.')}
  finally{rendering=false}
}
