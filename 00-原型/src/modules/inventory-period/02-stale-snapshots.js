// 快照是时点余额，不累计月内库存；local-sample明确区分原型样例与真实快照。
const IP_STALE_SNAPSHOTS_KEY='dashboard.inventory-snapshots.v1';
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
 return {date:snapshot.date,source:snapshot.source==='local-sample'?'local-sample':'snapshot',rows};
}
function ipReadSnapshots(){
 try{const data=JSON.parse(localStorage.getItem(IP_STALE_SNAPSHOTS_KEY)||'null');return data?.version===1&&Array.isArray(data.snapshots)?data.snapshots.map(ipNormalizeSnapshot).filter(Boolean):[]}catch(_){return []}
}
let ipStaleSnapshots=ipReadSnapshots(),ipSnapshotSaveFailed=false;
function ipCaptureSnapshot(records,date=DATA_CUTOFF){
 const actual=ipStaleSnapshots.filter(item=>item.source==='snapshot'&&item.date.slice(0,7)===date.slice(0,7)&&item.date<=date).sort((a,b)=>b.date.localeCompare(a.date))[0];
 if(actual)return actual;
 const rows=records.map(row=>{
  const sample={spuId:row.spuId,season:pfIdentity(row).attribute,totalUnits:row.totalUnits,totalValueCents:row.goodsValueCents,staleUnits:row.staleUnits,staleValueCents:row.staleValueCents};
  // 实际提供的批次不补造；仅为缺少批次的现有原型数据生成守恒样例。
  const batches=Array.isArray(row.staleBatches)?row.staleBatches.map(batch=>({receivedDate:batch.receivedDate,units:batch.units,valueCents:batch.valueCents??null})):
   ipStaleSampleBatches(sample,date,{date:row.staleOldestReceivedDate,units:row.staleOldestSellableUnits});
  return {...sample,batches};
 });
 const snapshot=ipNormalizeSnapshot({date,source:'local-sample',rows});if(!snapshot)return null;
 const previous=ipStaleSnapshots.find(item=>item.date===date);
 if(previous?.source==='snapshot')return previous;
 const history=ipStaleSampleHistory(snapshot,ipStaleSnapshots);
 if(previous&&!history.length&&JSON.stringify(previous)===JSON.stringify(snapshot))return previous;
 // 每月保留最后一份快照，最多十年；不受季品和页面期间筛选影响。
 const monthly=new Map();for(const item of [...history,...ipStaleSnapshots.filter(item=>item.date!==date),snapshot].sort((a,b)=>a.date.localeCompare(b.date)))monthly.set(item.date.slice(0,7),item);
 ipStaleSnapshots=[...monthly.values()].slice(-120);
 try{localStorage.setItem(IP_STALE_SNAPSHOTS_KEY,JSON.stringify({version:1,snapshots:ipStaleSnapshots}));ipSnapshotSaveFailed=false}catch(_){ipSnapshotSaveFailed=true}
 return snapshot;
}
