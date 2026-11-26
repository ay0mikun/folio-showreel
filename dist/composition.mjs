export const BACKGROUNDS={light:'#fefefe',dark:'#0e0e0e'};
export const GRADIENTS=[['#e6b8ff','#7a8dff'],['#ffcf85','#fa7a86'],['#bcead5','#739bff'],['#f6dcff','#b8e6ff'],['#30394a','#111217'],['#ffb0ce','#8765dc']];
export function resolveSize(screens,settings){
  if(settings.sizeMode==='custom')return [Number(settings.width),Number(settings.height)];
  const source=screens.find(screen=>screen.id===settings.sizeSourceId)||screens[0];
  return source?[source.width,source.height]:[1200,800];
}
export function sizeError(width,height){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)return 'Enter a whole number greater than zero for width and height.';
  if(width>8192||height>8192||width*height>33554432)return 'Use dimensions up to 8192 px per side and 32 megapixels in total.';
  return '';
}
export function fitRect(sourceWidth,sourceHeight,width,height,cover=false){
  const scale=(cover?Math.max:Math.min)(width/sourceWidth,height/sourceHeight);
  const w=sourceWidth*scale,h=sourceHeight*scale;
  return {x:(width-w)/2,y:(height-h)/2,width:w,height:h};
}
export function previewDimensions(width,height){
  const scale=Math.min(1,1280/width,900/height);
  return [Math.max(1,Math.round(width*scale)),Math.max(1,Math.round(height*scale))];
}
export function transitionEase(t,feel){
  t=Math.max(0,Math.min(1,t));
  return feel==='stiff'?Math.max(0,Math.min(1,(t-.4)*5)):t*t*t*(t*(t*6-15)+10);
}
const layers=new WeakMap();
function browserCanvas(width,height){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;return canvas}
export function screenRect(sourceWidth,sourceHeight,width,height,padding=0){
  // Padding is a percentage of the short side, shared between opposite edges.
  const inset=Math.min(width,height)*Math.max(0,Math.min(80,Number(padding)||0))/200;
  const rect=fitRect(sourceWidth,sourceHeight,width-inset*2,height-inset*2);
  return {...rect,x:rect.x+inset,y:rect.y+inset};
}
function paintImage(context,source,width,height,opacity=1,cover=false,settings={}){
  const rect=cover?fitRect(source.width,source.height,width,height,true):screenRect(source.width,source.height,width,height,settings.padding);
  context.save();context.globalAlpha=opacity;
  const radius=cover?0:Math.min(rect.width,rect.height)*Math.max(0,Math.min(100,Number(settings.radius)||0))/200;
  if(radius){context.beginPath();context.roundRect(rect.x,rect.y,rect.width,rect.height,radius);context.clip()}
  context.drawImage(source.image,rect.x,rect.y,rect.width,rect.height);context.restore();
}
export function renderComposition(context,width,height,time,screens,settings,background,makeCanvas=browserCanvas){
  context.save();context.globalAlpha=1;context.globalCompositeOperation='source-over';context.clearRect(0,0,width,height);
  const mode=settings.background||'light';
  if(mode!=='none'){
    context.fillStyle=mode==='solid'?settings.solidColor||BACKGROUNDS.light:BACKGROUNDS[mode]||BACKGROUNDS.light;
    if(mode==='gradient'){const colors=GRADIENTS[settings.gradient]||GRADIENTS[0],gradient=context.createLinearGradient(0,0,width,height);colors.forEach((color,index)=>gradient.addColorStop(index/(colors.length-1),color));context.fillStyle=gradient}
    context.fillRect(0,0,width,height);
    if(mode==='image'&&background)paintImage(context,background,width,height,1,true);
  }
  if(screens.length){
    const index=Math.min(screens.length-1,Math.floor(Math.max(0,time)/settings.seconds));
    const local=time-index*settings.seconds;
    const alpha=index<screens.length-1&&local>settings.seconds-settings.fade?transitionEase((local-settings.seconds+settings.fade)/settings.fade,settings.feel):0;
    if(alpha===0)paintImage(context,screens[index],width,height,1,false,settings);
    else{
      let layer=layers.get(context);
      if(!layer||layer.width!==width||layer.height!==height){const canvas=makeCanvas(width,height);layer={canvas,context:canvas.getContext('2d'),width,height};layers.set(context,layer)}
      const c=layer.context;c.clearRect(0,0,width,height);c.save();c.globalCompositeOperation='lighter';
      paintImage(c,screens[index],width,height,1-alpha,false,settings);paintImage(c,screens[index+1],width,height,alpha,false,settings);c.restore();
      context.drawImage(layer.canvas,0,0);
    }
  }
  context.restore();
}
