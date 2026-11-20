import {GIFEncoder,quantize,applyPalette} from './vendor/gifenc.mjs';
let encoder;
self.onmessage=event=>{
  const {type,rgba,width,height,delay}=event.data;
  try{
    if(type==='init'){encoder=GIFEncoder();self.postMessage({type:'ready'});return}
    if(type==='frame'){
      if(!encoder)throw new Error('GIF encoder is not initialized');
      const pixels=new Uint8Array(rgba);
      const palette=quantize(pixels,256,{format:'rgb565'});
      const indexed=applyPalette(pixels,palette,'rgb565');
      encoder.writeFrame(indexed,width,height,{palette,delay,repeat:0,dispose:1});
      if(encoder.bytesView().byteLength>256*1024*1024)throw new Error('This GIF is too large. Shorten the transitions or export video.');
      self.postMessage({type:'frame'});
    }else if(type==='finish'){
      encoder.finish();const bytes=encoder.bytes();encoder=null;
      self.postMessage({type:'done',buffer:bytes.buffer},[bytes.buffer]);
    }
  }catch(error){self.postMessage({type:'error',message:error.message})}
};
