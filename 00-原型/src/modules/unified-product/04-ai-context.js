// 产品AI独立分析上下文：不接收页面时间或平台筛选，累计、近期、月度口径分开。
const upAiFullContextCache=boundedCache(64);
function upAiFullContext(product){
 const p=upProduct(upIdentity(product)),end=DATA_CUTOFF,launch=p.actualLaunch||riskDateMin;
 const start=launch>end?end:launch,key=p.spuId+'|'+start+'|'+end;
 const cached=upAiFullContextCache.get(key);if(cached)return cached;
 const state={spuId:p.spuId,platform:'all',start,end,analysisScope:'full-product'};
 const recentStart=shiftDate(end,-29),previousEnd=shiftDate(recentStart,-1),previousStart=shiftDate(recentStart,-30);
 const company=upSummary(p,start,end,'all'),recent=upSummary(p,recentStart,end,'all'),previous=upSummary(p,previousStart,previousEnd,'all');
 const platformRows=qrPlatforms.map(platform=>upSummary(p,start,end,platform));
 const inventory=upWithRange(state,()=>pfCompanyStockModel(state));
 const months=[];
 for(let month=start.slice(0,7);month<=end.slice(0,7);month=riskMonthShift(month,1)){
  const last=new Date(Date.UTC(+month.slice(0,4),+month.slice(5,7),0)).toISOString().slice(0,10),cutoff=last>end?end:last;
  const facts=upSummary(p,month+'-01',cutoff,'all');
  months.push({month,start:month+'-01',end:cutoff,complete:last<=end,facts});
 }
 const m={product:p,company,current:company,recent,previous,platformRows,...inventory,previousStart,previousEnd,months};
 const result={model:m,state};upAiFullContextCache.set(key,result);return result;
}
