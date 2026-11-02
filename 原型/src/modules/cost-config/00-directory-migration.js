// 分类升级保留部门总目标；可识别旧细项合并到标准目录，歧义项保留原文与金额。
function cecUpgradeDepartmentDirectory(base,store){
 const copy=value=>JSON.parse(JSON.stringify(value)),standard=new Map(ccStandardMetrics.map(item=>[item.id,copy(item)]));
 const legacy=new Map(base.items.map(item=>[item.id,item]));
 const seedMap=Object.fromEntries(base.items.map(item=>[item.id,ccStandardMetric(item.department,item.metric)?.id||ccLegacySampleAssignments[item.id]||null]));
 if(store.costDirectoryVersion===1){
  const assignments={...seedMap,...store.costDirectoryAssignments};
  for(const [id,value] of Object.entries(store.metrics||{}))if(!standard.has(id))standard.set(id,{id,...value,name:value.metric,owner:''});
  return {store,items:[...standard.values()],ledger:cecDirectoryLedger(base.ledger,assignments)};
 }
 const metadata={...store.metrics},sourceIds=new Set([...legacy.keys(),...Object.keys(metadata),...Object.keys(store.months).map(key=>key.split('|')[0])]),assignments={...seedMap},metricMetadata={};
 for(const id of sourceIds){
  const original=legacy.get(id),saved=metadata[id],source={...original,...saved,metric:saved?.metric||original?.metric};
  if(!source.department||!source.metric)continue;
  const known=ccStandardMetric(source.department,source.metric);
  const hasSaved=Object.keys(store.months).some(key=>key.startsWith(id+'|'))||!!saved?.metric;
  if(!known&&!hasSaved)continue;
  const destination=known?.id||(standard.has(id)?'legacy-'+id:id);
  assignments[id]=destination;
  const item=known||{...source,id:destination,category:null,name:source.metric,owner:''};
  if(!standard.has(destination))standard.set(destination,copy(item));
  if(saved||!known)metricMetadata[destination]={department:item.department,category:item.category,metricIndex:item.metricIndex,metric:item.metric,updatedAt:saved?.updatedAt||''};
 }
 // 同名归并时，未上传的旧细项仍取原月值，避免把部分覆盖当成整个合计覆盖。
 const months={},destinations=new Set(Object.keys(store.months).map(key=>{const [id,month]=key.split('|');return (assignments[id]||id)+'|'+month}));
 for(const key of destinations){
  const [destination,month]=key.split('|'),members=[...sourceIds].filter(id=>(assignments[id]||id)===destination);
  const patches=members.map(id=>store.months[id+'|'+month]).filter(Boolean);
  const cell={updatedAt:patches.map(value=>value.updatedAt||'').sort().at(-1)||'',note:[...new Set(patches.map(value=>value.note).filter(Boolean))].join('；')};
  if(patches.some(value=>Object.hasOwn(value,'actualCents'))){
   const amounts=members.map(id=>{
    const patch=store.months[id+'|'+month];if(patch&&Object.hasOwn(patch,'actualCents'))return patch.actualCents;
    const row=base.ledger.find(value=>value.itemId===id&&value.month===month),events=row&&!row.actualMissing?row.confirmations.filter(event=>event.date<=DATA_CUTOFF):[];
    return events.length?events.reduce((sum,event)=>sum+event.cents,0):null;
   }).filter(Number.isFinite);
   cell.actualCents=amounts.length?amounts.reduce((sum,value)=>sum+value,0):null;
  }
  months[key]=cell;
 }
 return {items:[...standard.values()],ledger:cecDirectoryLedger(base.ledger,assignments),store:{...store,metrics:metricMetadata,months,costDirectoryVersion:1,costDirectoryAssignments:assignments}};
}
function cecDirectoryLedger(ledger,assignments){
 const groups=new Map();
 for(const row of ledger){
  const itemId=assignments[row.itemId];if(!itemId)continue;
  const key=itemId+'|'+row.month;
  if(!groups.has(key))groups.set(key,{...row,itemId,confirmations:[],targetCents:0,actualMissing:true});
  const merged=groups.get(key);merged.targetCents+=row.targetCents||0;
  merged.actualMissing=merged.actualMissing&&!!row.actualMissing;
  merged.confirmations.push(...row.confirmations);
 }
 return [...groups.values()];
}
