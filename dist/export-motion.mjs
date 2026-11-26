// Keep one action slot throughout progress → download; only reveal extra rows on success.
const EASE='cubic-bezier(.22,1,.36,1)';
const DURATION=480;
export function createExportMotion(dialog){
  const actions=dialog.querySelector('.export-actions');
  const cancel=dialog.querySelector('#cancelRender');
  const download=dialog.querySelector('#download');
  const share=dialog.querySelector('#shareResult');
  const back=dialog.querySelector('#backToEditor');
  const active=new Set();
  function animate(element,keyframes,options={}){
    const animation=element.animate(keyframes,{duration:DURATION,easing:EASE,...options});
    active.add(animation);animation.finished.catch(()=>{}).finally(()=>active.delete(animation));return animation;
  }
  function reset(){
    for(const animation of active)animation.cancel();active.clear();
    dialog.querySelectorAll('.morph-cancel-label').forEach(element=>element.remove());
    dialog.style.setProperty('--export-progress','0%');
  }
  function capture(){
    return {open:dialog.open,height:dialog.getBoundingClientRect().height,dialogTop:dialog.getBoundingClientRect().top,actions:actions.getBoundingClientRect(),top:dialog.querySelector('.export-top').getBoundingClientRect()};
  }
  function complete(previous){
    if(!previous.open||!dialog.open||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const next=dialog.getBoundingClientRect();
    // Animate actual bounds, preserving crisp text and the card's corner radius.
    animate(dialog,[{height:previous.height+'px'},{height:next.height+'px'}]);
    const actionY=(previous.actions.top-previous.dialogTop)-(actions.getBoundingClientRect().top-next.top);
    animate(actions,[{height:'36px',transform:`translateY(${actionY}px)`},{height:'124px',transform:'translateY(0)'}]);
    const label=document.createElement('span');label.className='morph-cancel-label';label.setAttribute('aria-hidden','true');
    const text=document.createElement('span');text.textContent='Cancel';label.append(text,cancel.querySelector('img').cloneNode(true));
    const downloadLabel=document.createElement('span');downloadLabel.textContent=download.textContent;download.replaceChildren(downloadLabel,label);
    animate(download,[{backgroundColor:'#1f1f1f',boxShadow:'0 0 0 1px #1a1a1a',color:'#555'},{backgroundColor:'#004cff',boxShadow:'0 1px 2px #0005,0 0 0 1px #004cffd9',color:'#fefefe'}]);
    animate(label,[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-5px)'}],{duration:180}).finished.then(()=>label.remove()).catch(()=>label.remove());
    animate(downloadLabel,[{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:300,delay:100,fill:'backwards'});
    for(const [element,delay] of [[share,140],[back,200]])animate(element,[{opacity:0,transform:'translateY(-8px)'},{opacity:1,transform:'translateY(0)'}],{duration:320,delay,fill:'backwards'});
    // Hide/reveal description changes the title block height; let its position settle softly too.
    const top=dialog.querySelector('.export-top');
    animate(top,[{transform:`translateY(${(previous.top.top-previous.dialogTop)-(top.getBoundingClientRect().top-next.top)}px)`},{transform:'translateY(0)'}]);
    animate(dialog.querySelector('.export-title'),[{opacity:.25},{opacity:1}],{duration:300});
  }
  return {reset,capture,complete};
}
