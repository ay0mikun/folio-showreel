import {triggerOrigin} from './trigger-motion.mjs';
// Native adaptation of the beUI color picker interaction pattern.
export function hsvToHex(h,s,v){
  h=((h%360)+360)%360;s=Math.max(0,Math.min(1,s));v=Math.max(0,Math.min(1,v));
  const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;
  const rgb=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
  return '#'+rgb.map(n=>Math.round((n+m)*255).toString(16).padStart(2,'0')).join('');
}
export function hexToHsv(hex){
  const rgb=hex.slice(0,7).replace('#','').match(/../g).map(n=>parseInt(n,16)/255),max=Math.max(...rgb),min=Math.min(...rgb),d=max-min;
  let h=0;if(d){if(max===rgb[0])h=((rgb[1]-rgb[2])/d)%6;else if(max===rgb[1])h=(rgb[2]-rgb[0])/d+2;else h=(rgb[0]-rgb[1])/d+4;h=(h*60+360)%360}
  return {h,s:max?d/max:0,v:max};
}
export function mountColorPicker(trigger,panel,onChange){
  const field=panel.querySelector('.color-field'),hue=panel.querySelector('.hue-slider'),thumb=panel.querySelector('.color-field-thumb'),palette=panel.querySelector('.picker-palette');
  const colors=['#3478f6','#3fb1d8','#e66aa4','#e55656','#ed9141','#e5b63c','#65a65a','#169d83'];
  panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Background color');
  let hsv={h:0,s:0,v:1},dragging=false,alpha=1,format='hex';
  const tools=document.createElement('div');tools.className='picker-tools';
  tools.innerHTML='<button type="button" class="picker-eyedropper" aria-label="Pick color from screen" hidden>⌾</button><div class="picker-tracks"></div>';
  hue.before(tools);tools.querySelector('.picker-tracks').append(hue);
  const opacity=document.createElement('input');opacity.type='range';opacity.min=0;opacity.max=100;opacity.value=100;opacity.className='alpha-slider';opacity.setAttribute('aria-label','Opacity');hue.after(opacity);
  const fields=document.createElement('div');fields.className='picker-fields';fields.innerHTML='<select aria-label="Color format"><option value="hex">HEX</option><option value="rgb">RGB</option><option value="hsl">HSL</option></select><div class="picker-channels"></div><span class="picker-current" aria-hidden="true"></span>';palette.before(fields);
  const channels=fields.querySelector('.picker-channels'),select=fields.querySelector('select'),swatch=fields.querySelector('.picker-current');
  const loupe=document.createElement('span');loupe.className='picker-loupe';field.append(loupe);
  const value=()=>hsvToHex(hsv.h,hsv.s,hsv.v)+(alpha<1?Math.round(alpha*255).toString(16).padStart(2,'0'):'');
  function channelValues(){const rgb=hsvToHex(hsv.h,hsv.s,hsv.v).slice(1).match(/../g).map(n=>parseInt(n,16));if(format==='rgb')return rgb;const l=hsv.v*(1-hsv.s/2);return [Math.round(hsv.h),Math.round((l===0||l===1?0:(hsv.v-l)/Math.min(l,1-l))*100),Math.round(l*100)]}
  function buildFields(){channels.replaceChildren();const names=format==='hex'?['Hex color']:format==='rgb'?['Red','Green','Blue']:['Hue','Saturation','Lightness'];names.forEach((name,index)=>{const input=document.createElement('input');input.setAttribute('aria-label',name);input.spellcheck=false;input.type=format==='hex'?'text':'number';if(format!=='hex'){input.min=0;input.max=format==='rgb'?255:index===0?359:100}input.addEventListener('change',()=>{if(format==='hex'){let hex=input.value.trim().toLowerCase();if(!hex.startsWith('#'))hex='#'+hex;if(/^#[0-9a-f]{3}$/i.test(hex))hex='#'+hex.slice(1).split('').map(c=>c+c).join('');if(!/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(hex)){input.setAttribute('aria-invalid','true');paint();return}hsv=hexToHsv(hex);alpha=hex.length===9?parseInt(hex.slice(7),16)/255:1}else{const values=[...channels.children].map(el=>Number(el.value));if(values.some(n=>!Number.isFinite(n)))return;if(format==='rgb'){hsv=hexToHsv('#'+values.map(n=>Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,'0')).join(''))}else{const [h,s,l]=values.map((n,i)=>i?Math.max(0,Math.min(100,n))/100:n),v=l+s*Math.min(l,1-l);hsv={h,s:v?2*(1-l/v):0,v}}}emit()});input.onkeydown=e=>{if(e.key==='Enter')input.blur();if(e.key==='Escape'){paint();input.blur()}};channels.append(input)});paint()}
  select.onchange=()=>{format=select.value;buildFields()};
  opacity.oninput=()=>{alpha=Number(opacity.value)/100;emit()};
  const eye=tools.querySelector('.picker-eyedropper');if('EyeDropper' in window){eye.hidden=false;eye.onclick=async()=>{try{const result=await new window.EyeDropper().open();hsv=hexToHsv(result.sRGBHex);emit()}catch{}}}

  function paint(){field.style.setProperty('--hue-color',hsvToHex(hsv.h,1,1));thumb.style.left=`clamp(6px,${hsv.s*100}%,calc(100% - 6px))`;thumb.style.top=`clamp(6px,${(1-hsv.v)*100}%,calc(100% - 6px))`;hue.value=hsv.h;field.setAttribute('aria-valuenow',Math.round(hsv.s*100));field.setAttribute('aria-valuetext',`Saturation ${Math.round(hsv.s*100)}%, brightness ${Math.round(hsv.v*100)}%`);trigger.dataset.colorValue=value();swatch.style.background=value();opacity.value=Math.round(alpha*100);opacity.style.setProperty('--alpha-color',hsvToHex(hsv.h,hsv.s,hsv.v));loupe.style.background=hsvToHex(hsv.h,hsv.s,hsv.v);loupe.style.left=thumb.style.left;loupe.style.top=thumb.style.top;const values=format==='hex'?[value()]:channelValues();[...channels.children].forEach((input,i)=>{if(document.activeElement!==input)input.value=values[i]});palette.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.color===value())))}
  function emit(){channels.querySelectorAll('[aria-invalid]').forEach(input=>input.removeAttribute('aria-invalid'));paint();onChange(value())}
  function point(event){const r=field.getBoundingClientRect();hsv.s=Math.max(0,Math.min(1,(event.clientX-r.left)/r.width));hsv.v=1-Math.max(0,Math.min(1,(event.clientY-r.top)/r.height));emit()}
  field.onpointerdown=event=>{if(event.button!==0)return;event.preventDefault();field.focus({preventScroll:true});dragging=true;field.classList.add('is-dragging');field.setPointerCapture(event.pointerId);point(event)};
  field.onpointermove=event=>{if(dragging)point(event)};field.onpointerup=field.onpointercancel=()=>{dragging=false;field.classList.remove('is-dragging')};
  field.onkeydown=event=>{const step=event.shiftKey?.1:.01;if(event.key==='ArrowLeft')hsv.s-=step;else if(event.key==='ArrowRight')hsv.s+=step;else if(event.key==='ArrowUp')hsv.v+=step;else if(event.key==='ArrowDown')hsv.v-=step;else if(event.key==='Home'){hsv.s=0;hsv.v=0}else if(event.key==='End'){hsv.s=1;hsv.v=1}else if(event.key==='PageUp')hsv.v+=.1;else if(event.key==='PageDown')hsv.v-=.1;else return;event.preventDefault();hsv.s=Math.max(0,Math.min(1,hsv.s));hsv.v=Math.max(0,Math.min(1,hsv.v));emit()};
  hue.oninput=()=>{hsv.h=Number(hue.value);emit()};
  for(const color of colors){const button=document.createElement('button');button.type='button';button.dataset.color=color.toLowerCase();button.style.background=color;button.setAttribute('aria-label',color);button.onclick=()=>{hsv=hexToHsv(color);alpha=1;emit()};palette.append(button)}
  function place(){const r=trigger.getBoundingClientRect(),width=Math.min(280,innerWidth-16),left=Math.max(8,Math.min(r.left,innerWidth-width-8)),height=panel.offsetHeight;panel.style.left=left+'px';const top=r.top-height-8>=8?r.top-height-8:Math.min(innerHeight-height-8,r.bottom+8);panel.style.top=top+'px';panel.style.setProperty('--trigger-origin',triggerOrigin(r,{left,top}))}
  panel.addEventListener('toggle',()=>{trigger.setAttribute('aria-expanded',String(panel.matches(':popover-open')));if(panel.matches(':popover-open')){place();field.focus({preventScroll:true})}else if(panel.contains(document.activeElement))trigger.focus({preventScroll:true})});
  const close=()=>{if(panel.matches(':popover-open'))panel.hidePopover()};window.addEventListener('resize',close);trigger.closest('.inspector').addEventListener('scroll',close,{passive:true});
  buildFields();
  return {setColor(color){alpha=color.length===9?parseInt(color.slice(7),16)/255:1;const next=hexToHsv(color);if(next.s===0)next.h=hsv.h;hsv=next;paint()}};
}
