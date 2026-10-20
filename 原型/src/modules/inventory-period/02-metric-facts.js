// 期间成本/交付/翻新从月度日期台账读取，仅把这三项结果合并到最新库存记录。
const ipMetricMonthCache=boundedCache(36),ipMetricCostCache=boundedCache(24);
function ipMetricMonths(start,end){
 const keys=[];let cursor=start.slice(0,7)+'-01';
 while(cursor<=end){keys.push(cursor.slice(0,7));const d=new Date(cursor+'T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);cursor=iso(d)}return keys;
}
function ipMetricMonth(month){
 const cached=ipMetricMonthCache.get(month);if(cached)return cached;
 const period={mode:'month',year:+month.slice(0,4),value:+month.slice(5,7)},range=bounds(period);
 const rows=ipWithMetricPeriod(period,()=>upWithRange({start:range.start,end:range.cutoff},()=>inventoryProductLedger()));
 const days=aiFlowDayDiff(range.start,range.cutoff)+1;
 const result={...range,rows:new Map(rows.map(row=>{
  // 本地台账的本月累计交付按有效日整数分配，切换期间不改变已生成的日期事实。
  const planned=splitTarget(row.monthDue,Array(days).fill(1)),delivered=splitTarget(row.monthOn,planned);
  return [row.spuId,{...row,planned,delivered}];
 }))};ipMetricMonthCache.set(month,result);return result;
}
function ipMetricRecords(records,period){
 const range=bounds(period),months=ipMetricMonths(range.start,range.cutoff).map(ipMetricMonth);
 const after=new Date(range.cutoff+'T00:00:00Z');after.setUTCDate(1);after.setUTCMonth(after.getUTCMonth()+3);after.setUTCDate(0);
 const eventEnd=iso(after)<DATA_CUTOFF?iso(after):DATA_CUTOFF;
 const events=ipMetricMonths(range.start,eventEnd).map(ipMetricMonth);
 const key=range.start+'|'+range.cutoff;let costs=ipMetricCostCache.get(key);
 if(!costs){costs=new Map(upWithRange({start:range.start,end:range.cutoff},()=>inventoryProductLedger()).map(row=>[row.spuId,{cost:row.cost,avg:row.avg}]));ipMetricCostCache.set(key,costs)}
 return records.map(record=>{
  let deliveryOn=0,deliveryDue=0;
  for(const month of months){
   const row=month.rows.get(record.spuId);if(!row)continue;
   const start=range.start>month.start?range.start:month.start,end=range.cutoff<month.cutoff?range.cutoff:month.cutoff;
   const first=aiFlowDayDiff(month.start,start),last=aiFlowDayDiff(month.start,end);
   deliveryDue+=targetSum(row.planned.slice(first,last+1));deliveryOn+=targetSum(row.delivered.slice(first,last+1));
  }
  const reports=events.map(month=>month.rows.get(record.spuId)).filter(row=>row?.refurbReported>=range.start&&row.refurbReported<=range.cutoff&&Number.isFinite(row.refurbDelay));
  const latest=reports.sort((a,b)=>b.refurbDelay-a.refurbDelay)[0];
  const {cost=0,avg=0}=costs.get(record.spuId)||{};
  const row={...record,cost,avg,deliveryOn,deliveryDue,refurbDelay:latest?.refurbDelay??null,refurbReported:latest?.refurbReported??null,refurbReturn:latest?.refurbReturn??null};
  return {...row,...ipStockSum([row])};
 });
}
