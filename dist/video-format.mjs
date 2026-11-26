// Keep every filename label aligned with the browser encoder selection.
export function videoEncoding(width,height,isSupported){
  const candidates=width%2||height%2
    ?['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm']
    :['video/mp4;codecs=avc1.420033','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
  const mimeType=candidates.find(isSupported);
  return mimeType?{mimeType,extension:mimeType.startsWith('video/mp4')?'mp4':'webm'}:null;
}
