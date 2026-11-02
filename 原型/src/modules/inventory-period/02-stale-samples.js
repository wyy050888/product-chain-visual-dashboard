// 明确的原型样例：整数件数、整数分守恒；不使用随机数，不覆盖已有快照。
function ipStaleSampleSeed(id){return [...String(id)].reduce((seed,char)=>(seed*31+char.charCodeAt(0))%65521,17)}
function ipStaleSampleBatches(row,date,oldest=null){
 if(!row.staleUnits)return [];
 const seed=ipStaleSampleSeed(row.spuId),weights=({'夏季品':[12,18,25,45],'冬季品':[43,28,18,11],'四季品':[29,27,23,21]})[row.season]||[25,25,25,25];
 const known=oldest&&ipSnapshotDate(oldest.date)&&oldest.date<=date&&Number.isSafeInteger(oldest.units)&&oldest.units>0;
 const oldestAge=known?aiFlowDayDiff(oldest.date,date):null,oldestUnits=known?Math.min(row.staleUnits,oldest.units):0;
 const quantities=splitTarget(row.staleUnits-oldestUnits,weights.map((value,index)=>value+(seed+index*7)%9));
 const ages=[66+seed%20,94+seed%20,124+seed%20,168+seed%80];
 const batches=quantities.map((units,index)=>({units,receivedDate:shiftDate(date,-(known?Math.min(ages[index],Math.max(0,oldestAge-1)):ages[index]))})).filter(batch=>batch.units>0);
 if(oldestUnits)batches.push({units:oldestUnits,receivedDate:oldest.date});
 // 不同批次价格略有差异，按件数与样例价权重分配金额，合计精确回到当前呆滞金额。
 const values=splitTarget(row.staleValueCents,batches.map(batch=>{
  const age=aiFlowDayDiff(batch.receivedDate,date),factor=age<90?.88:age<120?1:age<150?1.12:1.28;
  return batch.units*factor;
 }));
 const dates=new Map();batches.forEach((batch,index)=>{
  const item=dates.get(batch.receivedDate)||{receivedDate:batch.receivedDate,units:0,valueCents:0};item.units+=batch.units;item.valueCents+=values[index];dates.set(batch.receivedDate,item);
 });
 return [...dates.values()].sort((a,b)=>a.receivedDate.localeCompare(b.receivedDate));
}
function ipStaleSampleHistory(current,existing){
 const present=new Set(existing.map(snapshot=>snapshot.date.slice(0,7))),history=[],end=current.date.slice(0,7);
 // 补齐2025年起各月期末，已有的本地记录或真实快照优先，历史查询与筛选不重新生成。
 for(let cursor='2025-01';cursor<end;){
  const year=Number(cursor.slice(0,4)),month=Number(cursor.slice(5,7));
  if(!present.has(cursor)){
   const date=iso(new Date(Date.UTC(year,month,0)));
   const rows=current.rows.map(row=>{
    const seed=ipStaleSampleSeed(row.spuId),seasonPhase={'夏季品':1,'冬季品':7,'四季品':4}[row.season];
    const seasonal=Math.sin((month-seasonPhase)/12*Math.PI*2)*.055;
    const totalScale=(year===2025?.72+month*.014:.90+month*.012)+seasonal+(seed%7-3)*.004;
    const staleScale=(year===2025?.42+(month-1)*.04:.96+.30*Math.sin((month-1)/9*Math.PI))+seasonal*1.6;
    const totalUnits=Math.round(row.totalUnits*totalScale),totalValueCents=Math.round(row.totalValueCents*totalScale);
    const sample={...row,totalUnits,totalValueCents,staleUnits:Math.min(totalUnits,Math.round(row.staleUnits*staleScale)),staleValueCents:Math.min(totalValueCents,Math.round(row.staleValueCents*staleScale))};
    return {...sample,batches:ipStaleSampleBatches(sample,date)};
   });
   const snapshot=ipNormalizeSnapshot({date,source:'local-sample',rows});if(snapshot)history.push(snapshot);
  }
  cursor=iso(new Date(Date.UTC(year,month,1))).slice(0,7);
 }
 return history;
}
