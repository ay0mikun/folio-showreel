// Stable during a still-image hold; changes for every transition sample or visual edit.
export function previewFrameKey(width,height,time,screens,settings,background){
  const index=Math.min(screens.length-1,Math.floor(Math.max(0,time)/settings.seconds));
  const local=time-index*settings.seconds;
  const transition=index<screens.length-1&&local>settings.seconds-settings.fade;
  return JSON.stringify([width,height,screens[index]?.url,screens[index+1]?.url,transition?time:0,settings.background,settings.solidColor,settings.gradient,settings.padding,settings.radius,settings.seconds,settings.fade,settings.feel,background?.url]);
}
