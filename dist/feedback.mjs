// One invitation per visit; never interrupt an export, another dialog or a hidden tab.
export function createFeedbackPrompt({show,canShow,delay=30_000,setTimer=setTimeout,clearTimer=clearTimeout}){
  let timer=null,shown=false;
  function request(){
    if(shown)return false;
    if(!canShow()){arm();return false}
    shown=true;clearTimer(timer);timer=null;show();return true;
  }
  function arm(){clearTimer(timer);if(!shown)timer=setTimer(request,delay)}
  return {activity:arm,request,stop(){clearTimer(timer);timer=null},dismiss(){shown=true;clearTimer(timer);timer=null}};
}
