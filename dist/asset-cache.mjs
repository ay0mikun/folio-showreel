// Bounded decoded-image cache. Active/requested assets stay alive until their owner releases them.
export function createAssetCache({load,dispose=()=>{},retain=()=>false,maxEntries=2}){
  const entries=new Map();
  function trim(protectedKey){
    let ready=[...entries.values()].filter(entry=>entry.asset).length;
    for(const [key,entry] of entries){
      if(ready<=maxEntries)break;
      if(!entry.asset||key===protectedKey||retain(entry.asset,key))continue;
      entries.delete(key);dispose(entry.asset);ready--;
    }
  }
  return {
    get(key){
      let entry=entries.get(key);
      if(entry){entries.delete(key);entries.set(key,entry);return entry.promise}
      entry={asset:null,promise:null};
      entry.promise=Promise.resolve().then(()=>load(key)).then(asset=>{entry.asset=asset;trim(key);return asset},error=>{if(entries.get(key)===entry)entries.delete(key);throw error});
      entries.set(key,entry);return entry.promise;
    },
    trim:()=>trim(),
  };
}
