// Native stepping remains in charge. Feedback is visual only: no audio or haptics.
export function mountTactileRanges(root=document){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const animations=new WeakMap();
  for(const range of root.querySelectorAll('input[type="range"]')){
    let previous=Number(range.value),timer;
    const start=()=>{previous=Number(range.value);range.classList.add('is-adjusting')};
    const end=()=>range.classList.remove('is-adjusting');
    range.addEventListener('pointerdown',start);
    range.addEventListener('pointerup',end);range.addEventListener('pointercancel',end);range.addEventListener('blur',end);
    window.addEventListener('pointerup',end,{passive:true});
    range.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key))start()});
    range.addEventListener('keyup',end);
    range.addEventListener('input',()=>{
      const next=Number(range.value);if(next===previous)return;
      const direction=next>previous?1:-1;previous=next;
      range.dataset.stepping='true';clearTimeout(timer);timer=setTimeout(()=>delete range.dataset.stepping,100);
      const target=range.id==='screenDurationRange'?root.querySelector('#screenDuration'):range.id.endsWith('Range')?root.querySelector('#'+range.id.slice(0,-5)):range.id==='scrubber'?root.querySelector('#currentTime'):null;
      if(!target||reduced.matches)return;
      animations.get(target)?.cancel();
      const animation=target.animate([{transform:`translateY(${-direction}px)`,color:'#fefefe'},{transform:'translateY(0)',color:getComputedStyle(target).color}],{duration:100,easing:'cubic-bezier(.2,.8,.2,1)'});
      animations.set(target,animation);
    });
  }
}
