export function triggerOrigin(trigger,element){
  return `${trigger.left+trigger.width/2-element.left}px ${trigger.top+trigger.height/2-element.top}px`;
}
export function openFromTrigger(dialog,trigger){
  const anchor=trigger?.getBoundingClientRect?.()||trigger;
  dialog.dataset.triggered=String(Boolean(anchor));
  dialog.showModal();
  if(anchor)dialog.style.setProperty('--trigger-origin',triggerOrigin(anchor,{left:dialog.offsetLeft,top:dialog.offsetTop}));
}
