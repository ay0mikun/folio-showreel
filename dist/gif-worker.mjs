import {GIFEncoder} from './vendor/gifenc.mjs';
import {gifPalette} from './gif-palette.mjs';
let encoder,transparent=false;
self.onmessage=event=>{
  const {type,rgba,width,height,delay}=event.data;
  try{
    if(type==='init'){encoder=GIFEncoder();transparent=Boolean(event.data.transparent);self.postMessage({type:'ready'});return}
    if(type==='frame'){
      if(!encoder)throw new Error('GIF encoder is not initialized');
      const pixels=new Uint8Array(rgba);
      const frame=gifPalette(pixels,transparent);
      encoder.writeFrame(frame.indexed,width,height,{...frame,delay,repeat:0});
      if(encoder.bytesView().byteLength>256*1024*1024)throw new Error('This GIF is too large. Shorten the transitions or export video.');
      self.postMessage({type:'frame'});
    }else if(type==='finish'){
      encoder.finish();const bytes=encoder.bytes();encoder=null;
      self.postMessage({type:'done',buffer:bytes.buffer},[bytes.buffer]);
    }
  }catch(error){self.postMessage({type:'error',message:error.message})}
};
