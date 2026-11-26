import {createParticleField,averageCells} from './vendor/easyui-particles.mjs';
const PALETTE=['#8ea2ff','#7ee8d6','#ffd28a','#ff9bb8','#c4b0ff','#f4f4f5'];
export function revealState(progress,completed=false){
  const p=Math.max(0,Math.min(completed?1:.985,Number(progress)||0));
  const sharp=Math.max(0,Math.min(1,(p-.84)/.16));
  return {progress:p,gather:Math.max(0,Math.min(1,(p-.03)/.89)),sharp,blur:(1-sharp)*8,cloud:1-sharp};
}
export function createImageReveal(dialog){
  const canvas=dialog.querySelector('#exportParticles'),poster=dialog.querySelector('#exportPoster');
  const context=canvas.getContext('2d',{alpha:true}),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let field=null,pixels=null,buffer=null,colors=null,active=false,completed=false,target=0,current=0,raf=0,last=0,painted=0,time=0,gathered=false,finishedAt=0;
  function stop(){cancelAnimationFrame(raf);raf=0;active=false;field=pixels=buffer=colors=null;dialog.classList.remove('is-forming','reveal-pending');canvas.hidden=true;dialog.style.removeProperty('--reveal-sharp');dialog.style.removeProperty('--reveal-blur');dialog.style.removeProperty('--reveal-cloud');}
  function kick(){if(active&&!raf&&!document.hidden&&dialog.open)raf=requestAnimationFrame(frame)}
  function frame(now){
    raf=0;if(!active||!dialog.open){stop();return}if(document.hidden){last=0;return}
    const dt=Math.min(.05,last?(now-last)/1000:1/30);last=now;time+=dt;
    if(now-painted<1000/30){kick();return}painted=now;
    current+=(target-current)*(1-Math.exp(-dt*28));if(completed&&now-finishedAt>=220)current=1;
    const state=revealState(current,completed);
    if(state.progress<.03&&!completed){field.stepIdle(dt,time);field.draw(buffer,time,null,1)}
    else{if(!gathered){field.setTargets(colors);gathered=true}field.draw(buffer,time,state.gather,1)}
    context.putImageData(pixels,0,0);
    dialog.style.setProperty('--reveal-sharp',state.sharp);dialog.style.setProperty('--reveal-blur',state.blur+'px');dialog.style.setProperty('--reveal-cloud',state.cloud);
    if(completed&&current>=1){stop();return}
    if(!completed&&state.progress>=.03&&Math.abs(target-current)<.0001)return;
    kick();
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0}else kick()});
  dialog.addEventListener('close',stop);reduced.addEventListener('change',()=>{if(reduced.matches)stop()});
  return {
    start(){
      stop();if(reduced.matches||!context)return;
      const scale=Math.min(1,360/poster.width,240/poster.height);canvas.width=Math.max(1,Math.round(poster.width*scale));canvas.height=Math.max(1,Math.round(poster.height*scale));
      const sample=document.createElement('canvas');sample.width=canvas.width;sample.height=canvas.height;const c=sample.getContext('2d',{willReadFrequently:true});c.drawImage(poster,0,0,sample.width,sample.height);
      const cell=4;try{colors=averageCells(c.getImageData(0,0,sample.width,sample.height).data,sample.width,sample.height,cell)}catch{colors=null}
      field=createParticleField({width:canvas.width,height:canvas.height,cell,colors:PALETTE,seed:7});field.setTargets(colors);
      pixels=context.createImageData(canvas.width,canvas.height);buffer=new Uint32Array(pixels.data.buffer);
      active=true;completed=false;target=current=0;last=painted=time=0;gathered=false;canvas.hidden=false;
      dialog.classList.add('is-forming');dialog.style.setProperty('--reveal-sharp','0');dialog.style.setProperty('--reveal-cloud','1');kick();
    },
    progress(value){target=Math.max(target,Math.max(0,Math.min(.985,Number(value)||0)));kick()},
    finish(){if(!active){dialog.classList.remove('reveal-pending');return}completed=true;target=1;finishedAt=performance.now();kick()},
    stop,
  };
}
