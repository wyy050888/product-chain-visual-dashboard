// 店铺AI不接收页面筛选；历史累计、近期对比、月度记录和最新可用评分独立组织。
const sdAiContextCache=boundedCache(32);
function sdAiFullContext(shop){
 const start=riskDateMin,end=DATA_CUTOFF,key=shop.shopId+'|'+start+'|'+end;
 const cached=sdAiContextCache.get(key);if(cached)return cached;
 const latest=drawerWithPeriod({mode:'month',year:+end.slice(0,4),value:+end.slice(5,7)},()=>sbAllShops().find(s=>s.shopId===shop.shopId));
 if(!latest)throw new Error('未找到店铺全量分析资料');
 const state={start,end,analysisScope:'full-shop'},operating=sdOperatingFacts(latest,start,end),events=sdEvents(latest,start,end);
 const windowFacts=(from,to)=>{
  const points=operating.points.filter(p=>p.date>=from&&p.date<=to);
  const sales=points.reduce((sum,p)=>sum+p.sales,0),returned=points.reduce((sum,p)=>sum+p.returned,0);
  return {...rpShopPeriodFacts(latest,from,to,false),start:from,end:to,sales,returned,returnRate:sales?returned/sales*100:null};
 };
 const recentStart=[start,shiftDate(end,-29)].sort().at(-1),previousEnd=shiftDate(recentStart,-1),previousStart=[start,shiftDate(recentStart,-30)].sort().at(-1);
 const recent=windowFacts(recentStart,end),previous=previousEnd>=start?windowFacts(previousStart,previousEnd):{start:null,end:null,gsv:null,netSales:null,returnRate:null};
 const months=new Map();
 for(const p of operating.points){
  const month=p.date.slice(0,7);
  if(!months.has(month))months.set(month,{month,gsvCents:0,sales:0,returned:0,violations:0});
  const row=months.get(month);for(const k of ['gsvCents','sales','returned'])row[k]+=p[k];
 }
 for(const event of events){const row=months.get(event.date.slice(0,7));if(row)row.violations++}
 const model={shop:latest,current:rpShopPeriodFacts(latest,start,end,false),...operating,events,recent,previous,previousReturnRate:previous.returnRate,range:{start,end},months:[...months.values()]};
 const result={model,state};sdAiContextCache.set(key,result);return result;
}
