// Start the composition clock on its first captured frame, not encoder setup.
export function createVideoClock(duration){
  let start=null;
  return now=>{
    if(start===null)start=now;
    return Math.min(duration,Math.max(0,(now-start)/1000));
  };
}
