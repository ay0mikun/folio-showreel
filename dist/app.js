import {videoEncoding} from './video-format.mjs';
import {createAssetCache} from './asset-cache.mjs';
import {createToast} from './toast.mjs';
import {mountTactileRanges} from './tactile-ranges.mjs';
import {openFromTrigger} from './trigger-motion.mjs';
import {previewFrameKey} from './preview-cache.mjs';
import {createExportMotion} from './export-motion.mjs?v=6c8f9d2f73';
import {createFeedbackPrompt} from './feedback.mjs';
import {mountColorPicker} from './color-picker.mjs?v=e9540a853b';
import {gifFramePlan} from './gif-plan.mjs';
import {sortByFilename,moveSource} from './source-order.mjs';
import {resolveSize,sizeError,previewDimensions,renderComposition,GRADIENTS} from './composition.mjs?v=306888d011';
const elements=new Map();
const $=selector=>{let element=elements.get(selector);if(!element){element=document.querySelector(selector);if(element)elements.set(selector,element)}return element};
// Text fields can match :focus-visible after a click; rings follow Tab navigation only.
document.addEventListener('keydown',event=>{if(event.key==='Tab')document.documentElement.dataset.keyboardFocus=''},true);
document.addEventListener('pointerdown',()=>{delete document.documentElement.dataset.keyboardFocus},true);
const FPS=30,MAX_IMAGES=12;
const DEFAULTS={seconds:.6,fade:.48,feel:'soft',format:'video',orderMode:'name',background:'solid',solidColor:'#fefefe',gradient:0,backgroundPreset:null,padding:8,radius:0,projectName:'Name of file',sizeMode:'source',width:null,height:null,sizeSourceId:null};
let screens=[],settings={...DEFAULTS},backgroundAsset=null,pendingSizeError='',playing=false,position=0,lastFrame=0,db=null,saveTimer,outputURL=null,rendering=false,cancelRender=null;
const canvas=$('#preview'),context=canvas.getContext('2d',{alpha:true});
function fitNumberInput(input){
  // All numerical inputs use the same monospace font; ch follows its actual glyph width.
  input.style.width=`calc(${Math.max(1,(input.value||'0').length)}ch + 14px)`;
}
for(const input of document.querySelectorAll('.number-unit input'))input.addEventListener('input',()=>fitNumberInput(input));
const colorPicker=mountColorPicker($('#pickColor'),$('#colorPicker'),setSolidColor);
let presetRequest=0,presetLoading=false;
const presetCache=createAssetCache({load:loadPresetAsset,retain:(asset,key)=>asset===backgroundAsset||key===settings.backgroundPreset,dispose:asset=>{URL.revokeObjectURL(asset.url);asset.image.src=''}});
let interactivePreview=false;
let previewFrameID=null,lastPreviewTick=0,previewPaintKey='',previewBox=null,listSignature='';
const totalDuration=()=>screens.length*settings.seconds;
function outputSize(){return resolveSize(screens,settings)}
function formatTime(t){const tenths=Math.round(t*10),minutes=Math.floor(tenths/600),seconds=(tenths%600)/10;return `${String(minutes).padStart(2,'0')}:${seconds.toFixed(1).padStart(4,'0')}`}
const toast=createToast($('#toast'));
function notify(message,type='error'){toast.show(message,type)}
function setError(message){$('#uploadError').textContent=message;$('#uploadError').hidden=!message}
function setPlaying(value){if(playing===value&&$('#play').getAttribute('aria-label')===(value?'Pause preview':'Play preview'))return;playing=value;cancelAnimationFrame(previewFrameID);previewFrameID=null;lastFrame=0;lastPreviewTick=0;if(value&&!document.hidden)previewFrameID=requestAnimationFrame(frame);if(value)$('#play').innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pause preview-icon" aria-hidden="true"><rect x="14" y="3" width="5" height="18" rx="1"/><rect x="5" y="3" width="5" height="18" rx="1"/></svg>';else $('#play').replaceChildren(assetIcon('35-1990-imgFrame2'));$('#play').setAttribute('aria-label',value?'Pause preview':'Play preview')}
const ICONS={'35-1990-imgFrame2':'play','35-1990-imgFrame3':'restart','35-547-imgFrame1':'35-547-imgFrame2','35-3052-imgDefault':'remove','35-3052-imgHover':'remove-hover'};
function assetIcon(name,className='figma-icon'){const image=document.createElement('img');image.src=`assets/reelo/${ICONS[name]||name}.svg`;image.alt='';image.className=className;image.draggable=false;return image}
function updateRange(input){const percentage=(Number(input.value)-Number(input.min))/(Number(input.max)-Number(input.min))*100;input.style.setProperty('--progress',Math.max(0,Math.min(100,percentage))+'%');if(input.id==='scrubber')input.parentElement.style.setProperty('--progress',Math.max(0,Math.min(100,percentage))+'%')}
function downloadName(extension){return (settings.projectName||'Reelo showreel').replace(/[<>:"/\\|?*\x00-\x1f]/g,'').trim().slice(0,80)+'.'+extension}
function updateCompositionSize(bytes){$('#compositionSize').textContent='Comp size: '+(bytes/1024/1024).toFixed(1)+' MB'}
function draw(c,w,h,t){renderComposition(c,w,h,t,screens,settings,backgroundAsset)}
function updatePreview(){
  if(!screens.length)return;const [w,h]=outputSize();if(sizeError(w,h))return;
  if(!previewBox){const well=$('.canvas-well');previewBox=[Math.max(1,well.clientWidth-8),Math.max(1,well.clientHeight-8)]}
  const [aw,ah]=previewBox,scale=Math.min(1,aw/w,ah/h);
  const [pw,ph]=previewDimensions(w,h,aw,ah,window.devicePixelRatio||1,interactivePreview);
  canvas.style.width=w*scale+'px';canvas.style.height=h*scale+'px';
  if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;previewPaintKey=''}
  const index=Math.min(screens.length-1,Math.floor(position/settings.seconds));
  const key=previewFrameKey(pw,ph,position,screens,settings,backgroundAsset)+(interactivePreview?':edit':':final');
  if(key!==previewPaintKey){renderComposition(context,pw,ph,position,screens,interactivePreview?{...settings,previewQuality:'medium'}:settings,backgroundAsset);previewPaintKey=key}
  const timeLabel=formatTime(position);if($('#currentTime').textContent!==timeLabel)$('#currentTime').textContent=timeLabel;$('#scrubber').value=position;updateRange($('#scrubber'));
  const status=`Screen ${index+1} of ${screens.length}`;if($('#previewStatus').textContent!==status)$('#previewStatus').textContent=status;
}
new ResizeObserver(([entry])=>{previewBox=[Math.max(1,entry.contentRect.width),Math.max(1,entry.contentRect.height)];previewPaintKey='';updatePreview()}).observe($('.canvas-well'));
window.addEventListener('resize',()=>{previewBox=null;updatePreview()});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing)setPlaying(false)});
function frame(now){
  previewFrameID=null;if(!playing||rendering||document.hidden)return;
  if(lastFrame)position=Math.min(totalDuration(),position+(now-lastFrame)/1000);lastFrame=now;
  if(now-lastPreviewTick>=1000/FPS||position>=totalDuration()){updatePreview();lastPreviewTick=now}
  if(position>=totalDuration()){setPlaying(false);return}
  previewFrameID=requestAnimationFrame(frame);
}
let paintFrame=null,timingFrame=null,framingFrame=null;
function scheduleTiming(){if(timingFrame===null)timingFrame=requestAnimationFrame(()=>{timingFrame=null;syncTimingControls();updatePreview()})}
function scheduleFraming(){if(framingFrame===null)framingFrame=requestAnimationFrame(()=>{framingFrame=null;syncFramingControls();updatePreview()})}
function schedulePreview(){if(paintFrame===null)paintFrame=requestAnimationFrame(()=>{paintFrame=null;updatePreview()})}
function sync(){
  const has=screens.length>0,total=totalDuration(),[w,h]=outputSize();
  document.body.classList.toggle('has-screens',has);
  $('#preview').hidden=!has;$('#emptyPreview').hidden=has;
  for(const id of ['play','restart','scrubber','export'])$('#'+id).disabled=!has||Boolean(pendingSizeError||sizeError(w,h));
  if(presetLoading&&settings.background==='image')$('#export').disabled=true;
  $('#clearAll').hidden=!has;
  position=Math.min(position,total);syncTimingControls();
  syncCompositionControls(w,h);
  $('#exportFormat').value=settings.format;
  $('#transitionLabel').textContent=settings.feel;document.querySelectorAll('[data-feel]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.feel===settings.feel)));
  $('#projectName').value=settings.projectName;$('#projectName').style.width=Math.min(238,Math.max(26,settings.projectName.length*7.3))+'px';
  $('#projectExtension').textContent='.'+(settings.format==='video'?(videoEncoding(...outputSize(),type=>globalThis.MediaRecorder?.isTypeSupported(type))?.extension||'webm'):settings.format);
  syncFramingControls();
  updateCompositionSize(screens.reduce((sum,screen)=>sum+screen.blob.size,0)+(backgroundAsset?.blob.size||0));
  if(!has){$('#previewStatus').textContent='Waiting for your first screen';setPlaying(false)}
  updatePreview();renderList();
}
function syncFramingControls(){for(const key of ['padding','radius']){const input=$('#'+key),range=$('#'+key+'Range');input.value=range.value=settings[key];fitNumberInput(input);updateRange(range)}}
function syncTimingControls(){
  const total=totalDuration(),has=screens.length>0;
  $('#durationLabel').textContent=formatTime(total);$('#scrubber').max=total||1;
  $('#currentTime').textContent=formatTime(position);$('#scrubber').value=position;updateRange($('#scrubber'));
  $('#screenDurationRange').value=settings.seconds;updateRange($('#screenDurationRange'));
  $('#perScreenLabel').textContent=Number(settings.seconds.toFixed(2))+'s';$('#screenDuration').value=Number(settings.seconds.toFixed(3));
  $('#totalDuration').value=Number(total.toFixed(2));$('#totalDuration').disabled=!has;$('#totalDuration').min=screens.length*.1;$('#totalDuration').max=screens.length*10;
  fitNumberInput($('#screenDuration'));fitNumberInput($('#totalDuration'));
  const [w,h]=outputSize();$('#exportMeta').textContent=has?`${total.toFixed(1)} seconds · ${w} × ${h} · ${settings.format.toUpperCase()}`:'Add a screen to get started';
}
const lightweightTarget=target=>target.closest?.('.color-field,.hue-slider,.alpha-slider,#paddingRange,#radiusRange,#scrubber');
function endPreviewInteraction(){if(!interactivePreview)return;interactivePreview=false;previewPaintKey='';schedulePreview()}
document.addEventListener('pointerdown',event=>{if(lightweightTarget(event.target)){interactivePreview=true;schedulePreview()}},true);
window.addEventListener('pointerup',endPreviewInteraction,{passive:true});window.addEventListener('pointercancel',endPreviewInteraction,{passive:true});window.addEventListener('blur',endPreviewInteraction);
document.addEventListener('keydown',event=>{if(lightweightTarget(event.target)&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','PageUp','PageDown','Home','End'].includes(event.key))interactivePreview=true});
document.addEventListener('keyup',endPreviewInteraction);
function renderList(){
  const signature=screens.map(screen=>screen.id).join('|');if(signature===listSignature)return;listSignature=signature;
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
  notify(`Moved ${name} to position ${to+1}.`,'success');
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
  if(d.active)event.preventDefault()
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
async function acceptFiles(fileList){await ready;setError('');const files=sortByFilename([...fileList]);if(screens.length>=MAX_IMAGES){setError('Your showreel already has 12 screens. Remove one to add another.');return}let errors=[],added=0;for(const file of files){if(screens.length>=MAX_IMAGES){errors.push('Only the first 12 valid screens were added.');break}if(!['image/png','image/jpeg','image/webp','image/svg+xml'].includes(file.type)){errors.push(`${file.name}: use PNG, JPG, WebP or SVG.`);continue}if(file.size>40*1024*1024){errors.push(`${file.name}: please keep each image under 40 MB.`);continue}try{screens.push(await decodeAsset(file,file.name));added++}catch{errors.push(`${file.name} could not be opened. Try exporting it again.`)}}$('#files').value='';if(added){if(settings.orderMode==='name')screens=sortByFilename(screens);ensureSizeSource();position=0;sync();save();setPlaying(!matchMedia('(prefers-reduced-motion: reduce)').matches);notify(`${added} screen${added===1?'':'s'} added. Your ${totalDuration().toFixed(1)}-second showreel is ready to preview.`,'success')}setError(errors.join(' '))}
function syncCompositionControls(width,height){
  const has=screens.length>0,showSize=has||settings.sizeMode==='custom';
  if(!pendingSizeError){$('#canvasWidth').value=showSize?width:'';$('#canvasHeight').value=showSize?height:''}
  const error=pendingSizeError||(has?sizeError(width,height):'');$('#sizeError').textContent=error;$('#sizeError').hidden=!error;
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
document.querySelectorAll('[data-background]').forEach(button=>button.onclick=async()=>{
  await ready;presetRequest++;presetLoading=false;settings.background=button.dataset.background;
  if(settings.background==='none'&&settings.format==='video')settings.format='gif';
  if(settings.background==='image'&&!backgroundAsset){await choosePreset([7,8,9,10,12,11].includes(settings.backgroundPreset)?settings.backgroundPreset:7);return}
  sync();save();
});
$('#uploadBackground').onclick=()=>$('#backgroundFile').click();
$('#backgroundFile').onchange=e=>{presetRequest++;const file=e.target.files[0];e.target.value='';uploadBackground(file)};
$('[data-transparent]').onclick=async()=>{await ready;presetRequest++;presetLoading=false;settings.background='none';if(settings.format==='video')settings.format='gif';sync();save()};
async function loadPresetAsset(index){
  const formats=index===7?['avif','webp']:['webp'];
  for(const format of formats){try{const response=await fetch(`assets/reelo/preset-${index}.${format}`);if(!response.ok)throw new Error('Background unavailable');const asset=await decodeAsset(await response.blob(),`Background ${[7,8,9,10,12,11].indexOf(index)+1}`);asset.preset=true;return asset}catch(error){if(format===formats.at(-1))throw error}}
}
async function choosePreset(index){
  await ready;const request=++presetRequest;
  const previousPreset=settings.backgroundPreset;presetLoading=true;settings.backgroundPreset=index;settings.background='image';sync();
  try{const asset=await presetCache.get(index);if(request!==presetRequest)return;if(backgroundAsset&&!backgroundAsset.preset)URL.revokeObjectURL(backgroundAsset.url);backgroundAsset=asset;presetCache.trim();presetLoading=false;settings.backgroundPreset=index;settings.background='image';sync();save()}
  catch{if(request!==presetRequest)return;presetLoading=false;settings.backgroundPreset=previousPreset;if(!backgroundAsset)settings.background='none';sync();notify('Could not load the background. Please try again.')}
}
document.querySelectorAll('[data-preset]').forEach(button=>{
  button.onclick=()=>choosePreset(Number(button.dataset.preset));
});
function setSolidColor(color){
  presetRequest++;presetLoading=false;settings.background='solid';settings.solidColor=color;
  colorPicker.setColor(color);document.querySelectorAll('[data-color]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.color.toLowerCase()===color.toLowerCase())));
  $('#pickColor').setAttribute('aria-pressed',String(![...document.querySelectorAll('[data-color]')].some(button=>button.dataset.color.toLowerCase()===color.toLowerCase())));
  schedulePreview();save();
}

function ensureSizeSource(){if(!screens.some(screen=>screen.id===settings.sizeSourceId))settings.sizeSourceId=screens[0]?.id||null}
async function init(){
  try{
    db=await new Promise((resolve,reject)=>{const request=indexedDB.open('folio-showreel',1);request.onupgradeneeded=()=>request.result.createObjectStore('projects');request.onsuccess=()=>resolve(request.result);request.onerror=reject});
    const stored=await new Promise((resolve,reject)=>{const request=db.transaction('projects').objectStore('projects').get('current');request.onsuccess=()=>resolve(request.result);request.onerror=reject});
    if(stored){
      settings={...DEFAULTS,...stored.settings};
      settings.padding=Math.max(0,Math.min(80,Number(settings.padding)||0));settings.radius=Math.max(0,Math.min(100,Number(settings.radius)||0));settings.gradient=Math.max(0,Math.min(GRADIENTS.length-1,Math.round(Number(settings.gradient)||0)));
      if(!/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(settings.solidColor))settings.solidColor='#fefefe';settings.projectName=String(settings.projectName||'Name of file').slice(0,80);
      if(!['soft','stiff'].includes(settings.feel))settings.feel='soft';if(!['video','gif'].includes(settings.format))settings.format='video';if(!['name','custom'].includes(settings.orderMode))settings.orderMode='name';
      if(!['light','dark','none','image','solid','gradient'].includes(settings.background))settings.background='light';if(!['source','custom'].includes(settings.sizeMode))settings.sizeMode='source';
      settings.seconds=Math.max(.1,Math.min(10,Number(settings.seconds)||1.5));settings.fade=Math.max(.02,Math.min(3,settings.seconds*.8,Number(settings.fade)||.5));
      for(const entry of stored.screens.slice(0,MAX_IMAGES)){try{const asset=await decodeAsset(entry.blob,entry.name,entry.id);asset.sourceVersion=entry.sourceVersion||1;screens.push(asset)}catch{}}
      if(settings.background==='image'&&Number.isInteger(settings.backgroundPreset)&&[7,8,9,10,12,11].includes(settings.backgroundPreset)){try{backgroundAsset=await presetCache.get(settings.backgroundPreset)}catch{settings.background='none'}}
      if(stored.background){try{backgroundAsset=await decodeAsset(stored.background.blob,stored.background.name)}catch{settings.background='light'}}
      if(settings.background==='image'&&!backgroundAsset)settings.background='none';if(settings.background==='none'&&settings.format==='video')settings.format='gif';
      if(settings.orderMode==='name')screens=sortByFilename(screens);ensureSizeSource();
    }
    sync();
  }catch{$('#saveStatus').textContent='Device storage unavailable · this session only'}
}
function save(){clearTimeout(saveTimer);if($('#saveStatus').textContent!=='Saving on this device…')$('#saveStatus').textContent='Saving on this device…';saveTimer=setTimeout(()=>{if(!db){$('#saveStatus').textContent='This session only';return}try{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put({version:2,settings,background:backgroundAsset&&settings.backgroundPreset===null?{name:backgroundAsset.name,blob:backgroundAsset.blob}:null,screens:screens.map(({id,name,width,height,blob,sourceVersion})=>({id,name,width,height,blob,sourceVersion}))},'current');tx.oncomplete=()=>$('#saveStatus').textContent='Saved automatically on this device';tx.onerror=()=>{$('#saveStatus').textContent='Could not save · keep this tab open';notify('Device storage is full. You can still create and download your video.')}}catch{$('#saveStatus').textContent='Could not save · keep this tab open'}},200)}
const ready=init();document.fonts.ready.then(()=>ready).then(()=>sync());
$('#addSources').onclick=$('#upload').onclick=$('#emptyUpload').onclick=()=>$('#files').click();$('#files').onchange=e=>acceptFiles(e.target.files);for(const area of [$('.source-panel'),$('#dropStage')]){area.ondragover=e=>{e.preventDefault();area.classList.add('dragover')};area.ondragleave=()=>area.classList.remove('dragover');area.ondrop=e=>{e.preventDefault();area.classList.remove('dragover');if(!rendering)acceptFiles(e.dataTransfer.files)}}
$('#clearAll').onclick=()=>{screens.forEach(s=>URL.revokeObjectURL(s.url));screens=[];settings.orderMode='name';settings.sizeSourceId=null;pendingSizeError='';position=0;setError('');sync();save()};$('#play').onclick=()=>{if(position>=totalDuration())position=0;setPlaying(!playing);updatePreview()};$('#restart').onclick=()=>{position=0;setPlaying(true);updatePreview()};$('#scrubber').oninput=e=>{position=Number(e.target.value);setPlaying(false);updatePreview()};function timingChanged(persist=true){position=0;setPlaying(false);settings.fade=Math.min(settings.fade,settings.seconds*.8);scheduleTiming();if(persist)save()}
$('#screenDuration').onchange=async e=>{const v=Number(e.target.value);await ready;settings.seconds=Math.min(10,Math.max(.1,Number.isFinite(v)&&v>0?v:1.5));timingChanged()};
$('#totalDuration').onchange=async e=>{const v=Number(e.target.value);await ready;if(!screens.length)return;settings.seconds=Math.min(10,Math.max(.1,(Number.isFinite(v)&&v>0?v:totalDuration())/screens.length));timingChanged()};
document.querySelectorAll('[data-feel]').forEach(button=>button.onclick=async()=>{await ready;settings.feel=button.dataset.feel;sync();save()});
$('#exportFormat').onchange=async e=>{const value=e.target.value;await ready;settings.format=settings.background==='none'&&value==='video'?'gif':value;sync();save()};
$('#screenDurationRange').oninput=async e=>{const v=Number(e.target.value);await ready;settings.seconds=v;timingChanged(false)};
$('#screenDurationRange').addEventListener('change',save);
$('#resetTiming').onclick=async()=>{await ready;settings.seconds=DEFAULTS.seconds;timingChanged()};
$('#resetTransition').onclick=async()=>{await ready;settings.feel='soft';settings.fade=Math.min(.5,settings.seconds*.8);sync();save()};
$('#resetSettings').onclick=async()=>{await ready;presetRequest++;presetLoading=false;if(backgroundAsset&&!backgroundAsset.preset)URL.revokeObjectURL(backgroundAsset.url);backgroundAsset=null;settings={...DEFAULTS,orderMode:settings.orderMode,sizeSourceId:screens[0]?.id||null};pendingSizeError='';position=0;setPlaying(false);sync();save();notify('Settings reset. Your screens are kept.','success')};
$('#guideButton').onclick=()=>openFromTrigger($('#guide'),$('#guideButton'));
$('#guide').addEventListener('click',event=>{if(event.target===$('#guide')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close()}});
let feedbackAnchor=null;
document.addEventListener('click',event=>{const trigger=event.target.closest('#download,#backToEditor');if(trigger)feedbackAnchor=trigger.getBoundingClientRect()},true);
const feedback=createFeedbackPrompt({canShow:()=>!document.hidden&&!rendering&&!document.querySelector('dialog[open]')&&!document.querySelector('#colorPicker:popover-open'),show:()=>{setPlaying(false);openFromTrigger($('#supportDialog'),feedbackAnchor);feedbackAnchor=null}});
for(const event of ['pointerdown','pointermove','keydown','input','wheel'])document.addEventListener(event,()=>feedback.activity(),{passive:true});
document.addEventListener('visibilitychange',()=>document.hidden?feedback.stop():feedback.activity());
ready.then(()=>feedback.activity());
$('#supportButton').onclick=()=>{setPlaying(false);openFromTrigger($('#supportDialog'),$('#supportButton'))};
$('#supportLater').onclick=()=>$('#supportDialog').close();
$('#supportLink').onclick=()=>$('#supportDialog').close();
$('#supportDialog').addEventListener('close',()=>feedback.dismiss());
$('#download').addEventListener('click',()=>{setTimeout(()=>{if($('#renderDialog').classList.contains('is-ready'))$('#renderDialog').close()},0)});
$('#renderDialog').addEventListener('close',()=>{if($('#renderDialog').classList.contains('is-ready'))setTimeout(()=>feedback.request(),0);else feedback.activity()});
const exportMotion=createExportMotion($('#renderDialog'));
let imageReveal=null,revealImport=null,revealRun=0;
const warmImageReveal=()=>revealImport??=import('./image-reveal.mjs');
$('#export').addEventListener('pointerenter',()=>warmImageReveal().catch(()=>{}),{passive:true});
$('#export').addEventListener('focus',()=>warmImageReveal().catch(()=>{}));
$('#renderDialog').addEventListener('close',()=>{revealRun++;imageReveal?.stop()});
let exportStartGeometry=null;
function prepareExportDialog(){
  exportMotion.reset();exportStartGeometry=null;imageReveal?.stop();const run=++revealRun;
  const dialog=$('#renderDialog');dialog.classList.remove('is-ready');$('#shareResult').hidden=true;
  $('#exportFilename').textContent=downloadName(settings.format==='video'?(videoEncoding(...outputSize(),type=>globalThis.MediaRecorder?.isTypeSupported(type))?.extension||'webm'):settings.format);
  const [mediaWidth,mediaHeight]=outputSize(),mediaScale=Math.min(330/mediaWidth,220/mediaHeight);
  dialog.style.setProperty('--export-media-width',(mediaWidth*mediaScale/330*100)+'%');dialog.style.setProperty('--export-media-height',(mediaHeight*mediaScale/220*100)+'%');
  const poster=$('#exportPoster'),[w,h]=outputSize(),scale=Math.min(1,660/w,440/h);poster.width=Math.max(1,Math.round(w*scale));poster.height=Math.max(1,Math.round(h*scale));draw(poster.getContext('2d',{alpha:true}),poster.width,poster.height,0);
  dialog.classList.add('reveal-pending');
  warmImageReveal().then(({createImageReveal})=>{if(run!==revealRun||!rendering||dialog.classList.contains('is-ready'))return;imageReveal??=createImageReveal(dialog);imageReveal.start();imageReveal.progress($('#renderProgress').value/100)}).catch(()=>dialog.classList.remove('reveal-pending'));
}
function finishExportDialog(blob){
  imageReveal?.finish();$('#renderDialog').classList.remove('reveal-pending');
  const previous=exportStartGeometry||exportMotion.capture();exportStartGeometry=null;
  $('#cancelRender').hidden=true;$('#renderDialog').classList.add('is-ready');$('#shareResult').hidden=false;$('#renderTitle').textContent='Your reel is ready!';
  $('#exportFilename').textContent=$('#download').download;$('#download').textContent=`Download · ${(blob.size/1024/1024).toFixed(1)} MB`;
  exportMotion.complete(previous);
}
new MutationObserver(()=>{const value=$('#renderProgress').value;$('#renderDialog').style.setProperty('--export-progress',value+'%');imageReveal?.progress(value/100)}).observe($('#renderProgress'),{attributes:true,attributeFilter:['value']});
// MediaRecorder streams WebM without a Duration entry. Add it so players can seek
// and show the correct length. Segment size in streamed WebM is unspecified.
async function addWebmDuration(blob,duration){const bytes=new Uint8Array(await blob.arrayBuffer());function read(offset,id=false){if(offset>=bytes.length)return null;let mask=128,n=1;while(n<=8&&!(bytes[offset]&mask)){mask>>=1;n++}if(n>8||offset+n>bytes.length)return null;let value=id?bytes[offset]:bytes[offset]&(mask-1);for(let i=1;i<n;i++)value=value*256+bytes[offset+i];return {value,n}}
function encodeSize(value,n){if(value>=2**(7*n)-1)return null;const b=new Uint8Array(n);let v=value;for(let i=n-1;i>=0;i--){b[i]=v%256;v=Math.floor(v/256)}b[0]|=1<<(8-n);return b}
let offset=0,segment=null;while(offset<bytes.length){const id=read(offset,true);if(!id)break;const size=read(offset+id.n);if(!size)break;const start=offset+id.n+size.n;if(id.value===0x18538067){segment={start};break}offset=start+size.value}if(!segment)return blob;offset=segment.start;while(offset<bytes.length){const id=read(offset,true),size=id&&read(offset+id.n);if(!id||!size)break;const start=offset+id.n+size.n,end=start+size.value;if(end>bytes.length)break;if(id.value===0x1549a966){let scale=1000000,child=start;while(child<end){const cid=read(child,true),cs=cid&&read(child+cid.n);if(!cid||!cs)return blob;const pos=child+cid.n+cs.n;if(cid.value===0x4489)return blob;if(cid.value===0x2ad7b1){scale=0;for(let k=0;k<cs.value;k++)scale=scale*256+bytes[pos+k]}child=pos+cs.value}const newSize=encodeSize(size.value+11,size.n);if(!newSize)return blob;const durationEntry=new Uint8Array(11);durationEntry.set([0x44,0x89,0x88]);new DataView(durationEntry.buffer).setFloat64(3,duration*1e9/scale,false);const result=new Uint8Array(bytes.length+11);result.set(bytes.slice(0,offset+id.n));result.set(newSize,offset+id.n);result.set(bytes.slice(start,end),start);result.set(durationEntry,end);result.set(bytes.slice(end),end+11);return new Blob([result],{type:blob.type})}offset=end}return blob}
async function exportVideo(){await ready;if(!screens.length||rendering)return;const [w,h]=outputSize();if(typeof MediaRecorder==='undefined'||!canvas.captureStream){notify('Video export is not supported in this browser. Please use a recent Chrome, Edge, or Safari.');return}const encoding=videoEncoding(w,h,type=>MediaRecorder.isTypeSupported(type)),mime=encoding?.mimeType;if(!mime){notify('This browser cannot encode video. Please try a recent Chrome or Edge.');return}prepareExportDialog();let recorder,stream,frameID,cancelled=false,hidden=false;const dialog=$('#renderDialog'),duration=totalDuration();setPlaying(false);position=0;updatePreview();rendering=true;document.body.classList.add('rendering');$('#renderTitle').textContent='Creating your reel...';$('#renderDescription').textContent='Keep this tab open while your video renders.';$('#renderProgress').value=0;$('#renderPercent').textContent='0%';$('#cancelRender').hidden=false;$('#download').hidden=$('#backToEditor').hidden=true;openFromTrigger(dialog,$('#export'));cancelRender=()=>{cancelled=true;cancelAnimationFrame(frameID);if(recorder&&recorder.state!=='inactive')recorder.stop()};$('#cancelRender').onclick=()=>cancelRender?.();dialog.oncancel=e=>{e.preventDefault();cancelRender?.()};const onVisibility=()=>{if(document.hidden){hidden=true;cancelRender?.()}};document.addEventListener('visibilitychange',onVisibility);
try{const out=document.createElement('canvas');out.width=w;out.height=h;const c=out.getContext('2d',{alpha:false});if(!c||out.width!==w||out.height!==h)throw new Error('Unsupported canvas size');draw(c,w,h,0);stream=out.captureStream(FPS);const bitrate=Math.min(60_000_000,Math.max(10_000_000,Math.round(w*h*FPS*.18)));recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:bitrate});const chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};const stopped=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=e=>reject(e.error||new Error('Video encoder error'))});recorder.start(200);const start=performance.now();let lastEncodedAt=start-1000/FPS;const tick=now=>{const t=Math.min(duration,(now-start)/1000);if(now-lastEncodedAt<1000/FPS&&t<duration&&!cancelled){frameID=requestAnimationFrame(tick);return}lastEncodedAt=now;draw(c,w,h,Math.min(t,duration-.001));position=t;const pct=Math.min(100,Math.round(t/duration*100));$('#renderProgress').value=pct;$('#renderPercent').textContent=pct+'%';if(t<duration&&!cancelled)frameID=requestAnimationFrame(tick);else if(recorder.state!=='inactive')recorder.stop()};frameID=requestAnimationFrame(tick);await stopped;if(cancelled){dialog.close();notify(hidden?'Rendering stopped because the tab was hidden. Keep it visible and try again.':'Video creation cancelled.');return}if(!chunks.length)throw new Error('No video frames');let blob=new Blob(chunks,{type:recorder.mimeType||mime});if(mime.includes('webm')){try{blob=await addWebmDuration(blob,duration)}catch{}}if(outputURL)URL.revokeObjectURL(outputURL);outputURL=URL.createObjectURL(blob);const ext=mime.includes('mp4')?'mp4':'webm';exportStartGeometry=exportMotion.capture();updateCompositionSize(blob.size);$('#download').href=outputURL;$('#download').download=downloadName(ext);$('#renderDescription').textContent=`${screens.length} screen${screens.length===1?'':'s'} · ${duration.toFixed(1)} seconds · ${w} × ${h} · 30 fps`;$('#renderPercent').textContent='100%';$('#renderProgress').value=100;$('#download').hidden=$('#backToEditor').hidden=false;$('#backToEditor').onclick=()=>dialog.close();dialog.oncancel=null;finishExportDialog(blob);
}catch(error){console.error(error);dialog.close();notify('Could not finish the video. Please try again in a recent Chrome or Edge.')}finally{cancelAnimationFrame(frameID);document.removeEventListener('visibilitychange',onVisibility);stream?.getTracks().forEach(track=>track.stop());cancelRender=null;rendering=false;document.body.classList.remove('rendering')}};

async function exportGif(){
  if(!screens.length||rendering)return;
  if(typeof Worker==='undefined'){notify('GIF export needs a browser with Web Worker support.');return}
  const [w,h]=outputSize(),duration=totalDuration(),plan=gifFramePlan(screens.length,settings.seconds,settings.fade),dialog=$('#renderDialog');
  prepareExportDialog();let worker,pending,cancelled=false;
  rendering=true;setPlaying(false);position=0;updatePreview();document.body.classList.add('rendering');
  $('#renderTitle').textContent='Creating your reel...';
  $('#renderDescription').textContent='Keep this tab open while your GIF renders.';
  $('#renderProgress').value=0;$('#renderPercent').textContent='0%';$('#cancelRender').hidden=false;
  $('#download').hidden=$('#backToEditor').hidden=true;

  openFromTrigger(dialog,$('#export'));
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
      position=frame.time;const percent=Math.round((i+1)/plan.length*99);
      $('#renderProgress').value=percent;$('#renderPercent').textContent=percent+'%';
    }
    const result=await send({type:'finish'});if(cancelled)return;
    const blob=new Blob([result.buffer],{type:'image/gif'});
    if(outputURL)URL.revokeObjectURL(outputURL);outputURL=URL.createObjectURL(blob);
    exportStartGeometry=exportMotion.capture();updateCompositionSize(blob.size);$('#download').href=outputURL;$('#download').download=downloadName('gif');
    $('#renderDescription').textContent=`${screens.length} screen${screens.length===1?'':'s'} · ${duration.toFixed(1)} seconds · ${w} × ${h} · looping`;
    $('#renderPercent').textContent='100%';$('#renderProgress').value=100;$('#cancelRender').hidden=true;
    $('#download').hidden=$('#backToEditor').hidden=false;
    $('#backToEditor').onclick=()=>dialog.close();dialog.oncancel=null;position=duration;updatePreview();finishExportDialog(blob);
  }catch(error){dialog.close();if(cancelled)notify('GIF export cancelled.');else{console.error(error);notify('GIF export failed. '+error.message)}}
  finally{worker?.terminate();if(pending)clearTimeout(pending.timer);cancelRender=null;rendering=false;document.body.classList.remove('rendering')}
}
$('#export').onclick=async()=>{await ready;if(rendering||!screens.length)return;const error=pendingSizeError||sizeError(...outputSize());if(error){notify(error);return}settings.format==='gif'?await exportGif():await exportVideo()};

// The sidebar presents the same composition settings used by every export path.
$('#projectName').onchange=async event=>{const value=event.target.value.trim().replace(/\.(mp4|webm|gif|png)$/i,'');await ready;settings.projectName=value||'Name of file';sync();save()};
$('#projectName').onkeydown=event=>{if(event.key==='Enter')event.target.blur()};
for(const key of ['padding','radius'])for(const suffix of ['', 'Range']){
  $('#'+key+suffix).addEventListener(suffix?'input':'change',async event=>{const value=Number(event.target.value);await ready;settings[key]=Math.max(0,Math.min(key==='padding'?80:100,Number.isFinite(value)?value:0));scheduleFraming();if(!suffix)save()});
}
document.querySelectorAll('[data-ratio]').forEach(button=>button.onclick=async()=>{
  await ready;const [rw,rh]=button.dataset.ratio.split(':').map(Number),[w,h]=outputSize(),long=Math.max(w,h),unit=long/Math.max(rw,rh);
  const width=Math.max(1,Math.round(rw*unit)),height=Math.max(1,Math.round(rh*unit));
  const error=sizeError(width,height);if(error){notify(error);return}
  settings.sizeMode='custom';settings.width=width;settings.height=height;pendingSizeError='';sync();save();
});
document.querySelectorAll('[data-color]').forEach(button=>button.onclick=async()=>{await ready;setSolidColor(button.dataset.color);sync()});

mountTactileRanges();

for(const id of ['paddingRange','radiusRange'])$('#'+id).addEventListener('change',save);
