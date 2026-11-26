// Small, dependency-free HSV picker matching the supplied ASCIInator reference.
export function hsvToHex(h,s,v){
  h=((h%360)+360)%360;s=Math.max(0,Math.min(1,s));v=Math.max(0,Math.min(1,v));
  const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;
  const rgb=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
  return '#'+rgb.map(n=>Math.round((n+m)*255).toString(16).padStart(2,'0')).join('');
}
export function hexToHsv(hex){
  const rgb=hex.replace('#','').match(/../g).map(n=>parseInt(n,16)/255),max=Math.max(...rgb),min=Math.min(...rgb),d=max-min;
  let h=0;if(d){if(max===rgb[0])h=((rgb[1]-rgb[2])/d)%6;else if(max===rgb[1])h=(rgb[2]-rgb[0])/d+2;else h=(rgb[0]-rgb[1])/d+4;h=(h*60+360)%360}
  return {h,s:max?d/max:0,v:max};
}
export function mountColorPicker(trigger,panel,onChange){
  const field=panel.querySelector('.color-field'),hue=panel.querySelector('.hue-slider'),thumb=panel.querySelector('.color-field-thumb'),palette=panel.querySelector('.picker-palette');
  const colors=['#FFFFFF','#D4D4D4','#A3A3A3','#737373','#404040','#171717','#EF4444','#F97316','#EAB308','#22C55E','#06B6D4','#3B82F6','#8B5CF6','#EC4899','#F43F5E','#84CC16','#14B8A6','#6366F1'];
  let hsv={h:0,s:0,v:1},dragging=false;
  function paint(){field.style.setProperty('--hue-color',hsvToHex(hsv.h,1,1));thumb.style.left=`clamp(6px,${hsv.s*100}%,calc(100% - 6px))`;thumb.style.top=`clamp(6px,${(1-hsv.v)*100}%,calc(100% - 6px))`;hue.value=hsv.h;field.setAttribute('aria-valuenow',Math.round(hsv.s*100));field.setAttribute('aria-valuetext',`Saturation ${Math.round(hsv.s*100)}%, brightness ${Math.round(hsv.v*100)}%`);trigger.dataset.colorValue=hsvToHex(hsv.h,hsv.s,hsv.v)}
  function emit(){paint();onChange(hsvToHex(hsv.h,hsv.s,hsv.v))}
  function point(event){const r=field.getBoundingClientRect();hsv.s=Math.max(0,Math.min(1,(event.clientX-r.left)/r.width));hsv.v=1-Math.max(0,Math.min(1,(event.clientY-r.top)/r.height));emit()}
  field.onpointerdown=event=>{if(event.button!==0)return;event.preventDefault();field.focus({preventScroll:true});dragging=true;field.setPointerCapture(event.pointerId);point(event)};
  field.onpointermove=event=>{if(dragging)point(event)};field.onpointerup=field.onpointercancel=()=>{dragging=false};
  field.onkeydown=event=>{const step=event.shiftKey?.1:.01;if(event.key==='ArrowLeft')hsv.s-=step;else if(event.key==='ArrowRight')hsv.s+=step;else if(event.key==='ArrowUp')hsv.v+=step;else if(event.key==='ArrowDown')hsv.v-=step;else return;event.preventDefault();hsv.s=Math.max(0,Math.min(1,hsv.s));hsv.v=Math.max(0,Math.min(1,hsv.v));emit()};
  hue.oninput=()=>{hsv.h=Number(hue.value);emit()};
  for(const color of colors){const button=document.createElement('button');button.type='button';button.style.background=color;button.setAttribute('aria-label',color);button.onclick=()=>{hsv=hexToHsv(color);emit()};palette.append(button)}
  function place(){const r=trigger.getBoundingClientRect(),width=256,left=Math.max(8,Math.min(r.left,innerWidth-width-8)),height=panel.getBoundingClientRect().height;panel.style.left=left+'px';panel.style.top=(r.top-height-8>=8?r.top-height-8:Math.min(innerHeight-height-8,r.bottom+8))+'px'}
  panel.addEventListener('toggle',()=>{trigger.setAttribute('aria-expanded',String(panel.matches(':popover-open')));if(panel.matches(':popover-open'))place()});
  const close=()=>{if(panel.matches(':popover-open'))panel.hidePopover()};window.addEventListener('resize',close);trigger.closest('.inspector').addEventListener('scroll',close,{passive:true});
  return {setColor(color){const next=hexToHsv(color);if(next.s===0)next.h=hsv.h;hsv=next;paint()}};
}
