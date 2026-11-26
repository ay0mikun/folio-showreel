export function triggerOrigin(trigger,element){
  return `${trigger.left+trigger.width/2-element.left}px ${trigger.top+trigger.height/2-element.top}px`;
}
export function openFromTrigger(dialog,trigger){
  const anchor=trigger?.getBoundingClientRect?.()||trigger;
  dialog.dataset.triggered=String(Boolean(anchor));
  dialog.showModal();
  if(anchor)dialog.style.setProperty('--trigger-origin',triggerOrigin(anchor,{left:dialog.offsetLeft,top:dialog.offsetTop}));
}
export function revealFromTrigger(surface,trigger){
  if(!trigger||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  surface.style.transformOrigin=triggerOrigin(trigger.getBoundingClientRect(),surface.getBoundingClientRect());
  surface.animate([{opacity:0,transform:'scale(.92)'},{opacity:1,transform:'scale(1)'}],{duration:220,easing:'cubic-bezier(.2,.8,.2,1)'});
}
