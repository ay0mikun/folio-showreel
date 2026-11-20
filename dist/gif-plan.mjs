// GIF delays are measured in hundredths of a second. Collapse each still hold
// into one frame, and sample only the dissolves at 20 fps.
export function gifFramePlan(count,seconds,fade){
  const frames=[];
  for(let i=0;i<count;i++){
    const start=Math.round(i*seconds*100),end=Math.round((i+1)*seconds*100);
    const fadeStart=i===count-1?end:Math.max(start,Math.round(((i+1)*seconds-fade)*100));
    if(fadeStart>start)frames.push({time:i*seconds,delay:(fadeStart-start)*10});
    const span=end-fadeStart,steps=Math.max(1,Math.round(span/5));
    if(span>0)for(let k=0;k<steps;k++){
      const a=fadeStart+Math.round(span*k/steps),b=fadeStart+Math.round(span*(k+1)/steps);
      if(b>a)frames.push({time:(a+b)/200,delay:(b-a)*10});
    }
  }
  return frames;
}
