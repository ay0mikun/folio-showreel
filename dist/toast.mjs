export function createToast(element){
  const message=element.querySelector('.toast-message'),icon=element.querySelector('.toast-status'),close=element.querySelector('.toast-dismiss');
  let timer=null,hideTimer=null,remaining=4500,started=0;
  function dismiss(){
    clearTimeout(timer);timer=null;clearTimeout(hideTimer);element.classList.remove('visible');
    hideTimer=setTimeout(()=>{if(element.matches(':popover-open'))element.hidePopover()},180);
  }
  function resume(){if(!element.classList.contains('visible')||element.matches(':hover')||element.contains(document.activeElement))return;clearTimeout(timer);started=performance.now();timer=setTimeout(dismiss,remaining)}
  function pause(){if(timer===null)return;clearTimeout(timer);timer=null;remaining=Math.max(0,remaining-(performance.now()-started))}
  close.onclick=dismiss;element.addEventListener('pointerenter',pause);element.addEventListener('pointerleave',resume);
  element.addEventListener('focusin',pause);element.addEventListener('focusout',()=>{if(!element.contains(document.activeElement))resume()});
  return {show(text,type='error'){
    clearTimeout(timer);clearTimeout(hideTimer);remaining=4500;
    element.dataset.type=type;icon.src=`assets/reelo/toast-${type==='success'?'check':'info'}.svg`;
    element.setAttribute('role',type==='success'?'status':'alert');element.setAttribute('aria-live',type==='success'?'polite':'assertive');
    message.textContent=text;
    if(element.showPopover&&!element.matches(':popover-open'))element.showPopover();
    element.classList.add('visible');resume();
  },dismiss};
}
