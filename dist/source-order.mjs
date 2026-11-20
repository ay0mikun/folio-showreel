const filenames=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'});
export function sortByFilename(items){return [...items].sort((a,b)=>filenames.compare(a.name,b.name))}
export function moveSource(items,from,to){
  if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=items.length||to>=items.length||from===to)return items;
  const next=[...items];next.splice(to,0,next.splice(from,1)[0]);return next;
}
