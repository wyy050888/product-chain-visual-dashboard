// 固定库存场景：只调整演示余额，风险由可售天数计算；清仓状态由OA人工决定。
function inventoryCoverageSample(record){
 const product=upIdentity(record),state=newLaunchSamples.get(product.spuId)?.salesState;
 const scenario=state==='缺货'?'shortage':state==='滞销'?'stagnant':product.stockSampleScenario;
 if(!scenario)return record;
 const recent=upSummary(product,shiftDate(DATA_CUTOFF,-14),DATA_CUTOFF,'all'),dailyNet=(recent.sales-recent.returned)/15;
 if(dailyNet<=0)return record;
 const [warehouseDays,totalDays]=({shortage:[16,22],transfer:[6,45],'shortage-transfer':[4,12],stagnant:[90,115]})[scenario];
 const num=Math.max(1,Math.round(dailyNet*warehouseDays)),scale=record.num?num/record.num:1;
 const total=Math.max(num,Math.round(dailyNet*totalDays)),undelivered=Math.round((total-num)*.2);
 const amountCents=Math.round(record.amountCents*scale),staleCents=Math.min(amountCents,Math.round(record.staleCents*scale));
 const staleUnits=amountCents?Math.round(num*staleCents/amountCents):0;
 // 滞销场景补充可核对的最早批次样例；批次数量属于呆滞数量的子集。
 const batch=scenario==='stagnant'&&!record.staleOldestReceivedDate?{
  staleOldestReceivedDate:shiftDate(DATA_CUTOFF,-(75+product.sourceRow%4*12)),staleOldestSellableUnits:Math.round(staleUnits*.25)}:{};
 return {...record,...batch,num,amountCents,staleCents,avg:record.avg*scale,
  sampleFactoryUnits:total-num-undelivered,sampleUndeliveredUnits:undelivered,
  ...(Number.isFinite(record.staleOldestSellableUnits)?{staleOldestSellableUnits:Math.min(num,Math.round(record.staleOldestSellableUnits*scale))}:{})};
}
