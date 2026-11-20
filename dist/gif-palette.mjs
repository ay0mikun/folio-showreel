import {quantize,applyPalette} from './vendor/gifenc.mjs';
export function gifPalette(pixels,transparent=false){
  const palette=quantize(pixels,transparent?255:256,{format:'rgb565'});
  const indexed=applyPalette(pixels,palette,'rgb565');
  if(!transparent)return {palette,indexed,transparent:false,dispose:1};
  const transparentIndex=palette.length;palette.push([0,0,0]);
  for(let i=0;i<indexed.length;i++)if(pixels[i*4+3]<128)indexed[i]=transparentIndex;
  return {palette,indexed,transparent:true,transparentIndex,dispose:2};
}
