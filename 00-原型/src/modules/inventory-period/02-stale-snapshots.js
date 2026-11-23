// 快照是时点余额，不累计月内库存；local-sample明确区分原型样例与真实快照。
const IP_STALE_SNAPSHOTS_KEY='dashboard.inventory-snapshots.v1';
const ipTotalStockScope='five-parts';
function ipSnapshotDate(date){return typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date}
function ipNormalizeSnapshot(snapshot){
 if(!ipSnapshotDate(snapshot?.date)||!Array.isArray(snapshot.rows))return null;
 const ids=new Set(),nonnegative=value=>Number.isSafeInteger(value)&&value>=0;
 const rows=[];
 for(const row of snapshot.rows){
  if(!row?.spuId||ids.has(String(row.spuId))||!filterCatalog.seasons.includes(row.season))return null;
  if(!['totalUnits','totalValueCents','staleUnits','staleValueCents'].every(key=>nonnegative(row[key]))||row.staleUnits>row.totalUnits||row.staleValueCents>row.totalValueCents)return null;
  ids.add(String(row.spuId));
  const batches=Array.isArray(row.batches)?row.batches:[];
  if(batches.some(batch=>!ipSnapshotDate(batch.receivedDate)||batch.receivedDate>snapshot.date||!nonnegative(batch.units)||(batch.valueCents!==null&&!nonnegative(batch.valueCents))))return null;
  if(targetSum(batches.map(batch=>batch.units))>row.staleUnits||targetSum(batches.map(batch=>batch.valueCents??0))>row.staleValueCents)return null;
  rows.push({spuId:String(row.spuId),season:row.season,totalUnits:row.totalUnits,totalValueCents:row.totalValueCents,staleUnits:row.staleUnits,staleValueCents:row.staleValueCents,batches:batches.map(batch=>({receivedDate:batch.receivedDate,units:batch.units,valueCents:batch.valueCents}))});
 }
 return {date:snapshot.date,source:snapshot.source==='local-sample'?'local-sample':'snapshot',scope:snapshot.scope===ipTotalStockScope?ipTotalStockScope:'legacy',rows};
}
function ipReadSnapshots(){
 try{const data=JSON.parse(localStorage.getItem(IP_STALE_SNAPSHOTS_KEY)||'null');return data?.version===1&&Array.isArray(data.snapshots)?data.snapshots.map(ipNormalizeSnapshot).filter(Boolean):[]}catch(_){return []}
}
let ipStaleSnapshots=ipReadSnapshots();
function ipSnapshotsForStorage(snapshots,current){
 return snapshots.map(snapshot=>{
  if(snapshot===current||snapshot.source!=='local-sample'||snapshot.rows.every(row=>row.spuId==='sample:'+row.season&&!row.batches.length))return snapshot;
  // 历史样例仅供货值趋势按季品汇总，当前分布和真实快照保留批次明细。
  const seasons=new Map();
  for(const {season,totalUnits,totalValueCents,staleUnits,staleValueCents} of snapshot.rows){
   if(!seasons.has(season))seasons.set(season,{spuId:'sample:'+season,season,totalUnits:0,totalValueCents:0,staleUnits:0,staleValueCents:0,batches:[]});
   const totals=seasons.get(season);
   totals.totalUnits+=totalUnits;totals.totalValueCents+=totalValueCents;
   totals.staleUnits+=staleUnits;totals.staleValueCents+=staleValueCents;
  }
  return {...snapshot,rows:[...seasons.values()]};
 });
}
function ipCacheSnapshots(snapshots){
 ipStaleSnapshots=snapshots;
 try{localStorage.setItem(IP_STALE_SNAPSHOTS_KEY,JSON.stringify({version:1,snapshots:ipStaleSnapshots}))}catch{
  // 样例缓存写入受限时，图表仍使用本次页面生成的快照。
 }
}
function ipCaptureSnapshot(records,date=DATA_CUTOFF){
 const actual=ipStaleSnapshots.filter(item=>item.source==='snapshot'&&item.scope===ipTotalStockScope&&item.date.slice(0,7)===date.slice(0,7)&&item.date<=date).sort((a,b)=>b.date.localeCompare(a.date))[0];
 if(actual)return actual;
 const rows=records.map(row=>{
  const sample={spuId:row.spuId,season:pfIdentity(row).attribute,totalUnits:row.totalUnits,totalValueCents:row.goodsValueCents,staleUnits:row.staleUnits,staleValueCents:row.staleValueCents};
  // 实际提供的批次不补造；仅为缺少批次的现有原型数据生成守恒样例。
  const batches=Array.isArray(row.staleBatches)?row.staleBatches.map(batch=>({receivedDate:batch.receivedDate,units:batch.units,valueCents:batch.valueCents??null})):
   ipStaleSampleBatches(sample,date,{date:row.staleOldestReceivedDate,units:row.staleOldestSellableUnits});
  return {...sample,batches};
 });
 const snapshot=ipNormalizeSnapshot({date,source:'local-sample',scope:ipTotalStockScope,rows});if(!snapshot)return null;
 const existing=ipStaleSnapshots.filter(item=>item.source==='snapshot'||item.scope===ipTotalStockScope);
 const previous=existing.find(item=>item.date===date&&item.scope===ipTotalStockScope);
 const history=ipStaleSampleHistory(snapshot,existing);
 if(previous&&!history.length&&existing.length===ipStaleSnapshots.length&&JSON.stringify(previous)===JSON.stringify(snapshot)){
  const compact=ipSnapshotsForStorage(existing,previous);
  if(compact.some((item,index)=>item!==existing[index]))ipCacheSnapshots(compact);
  return previous;
 }
 // 每月保留最后一份快照，最多十年；不受季品和页面期间筛选影响。
 const monthly=new Map();for(const item of [...history,...existing.filter(item=>item.date!==date||item.scope!==ipTotalStockScope),snapshot].sort((a,b)=>a.date.localeCompare(b.date)))monthly.set(item.date.slice(0,7)+'|'+item.scope,item);
 ipCacheSnapshots(ipSnapshotsForStorage([...monthly.values()].slice(-120),snapshot));
 return snapshot;
}
