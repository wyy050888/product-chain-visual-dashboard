// 月度前缀和复用跨月、跨年及环比区间；缓存只保留紧凑列，不保留整年对象副本。
const upMonthCache=boundedCache(3200,100000);
const upDailyCache=boundedCache(1600,100000),upSummaryCache=boundedCache(6400);
const upEmptyMonths=new Map();
// 未收退率共用原始件数计算，避免对已格式化的百分比做减法。
function upUnreceivedRate({sales,returned,received}){
 return Number.isFinite(sales)&&sales>0&&Number.isFinite(returned)&&Number.isFinite(received)&&returned>=received?(returned-received)/sales*100:null;
}
function upChannels(platform){return platform==='all'?qrPlatforms:Array.isArray(platform)?qrPlatforms.filter(p=>platform.includes(p)):[platform]}
function upMonthFacts(p,platform,month,version){
 const start=month+'-01',days=new Date(Date.UTC(+month.slice(0,4),+month.slice(5,7),0)).getUTCDate();
 const end=month+'-'+days;
 // 上架前没有经营量或目标；共享零列，避免历史空月份挤掉有效缓存。
 if(end<upProduct(p).actualLaunch){
  if(!upEmptyMonths.has(days))upEmptyMonths.set(days,{columns:upSummaryFields.map(()=>new Float64Array(days+1)),days});
  return upEmptyMonths.get(days);
 }
 const key=upFactsKey(p,platform,month,month,version),cached=upMonthCache.get(key);
 if(cached!==undefined)return cached;
 const columns=upSummaryFields.map(()=>new Float64Array(days+1)),rows=upBuildDaily(p,platform,start,end,version);
 for(let f=0;f<upSummaryFields.length;f++)for(let i=0;i<days;i++)columns[f][i+1]=columns[f][i]+rows[i][upSummaryFields[f]];
 return upMonthCache.set(key,{columns,days},days);
}
function upRangeMonths(start,end){
 const ranges=[];
 for(let month=start.slice(0,7);month<=end.slice(0,7);month=riskMonthShift(month,1))
  ranges.push({month,first:month===start.slice(0,7)?+start.slice(8):1,last:month===end.slice(0,7)?+end.slice(8):null});
 return ranges;
}
// 只有图表/逐日明细读取 points 时才展开对象；汇总与排序直接读取前缀和。
function upDaily(p,platform,start,end,version=upFactsVersion(p)){
 const key=upFactsKey(p,platform,start,end,version),cached=upDailyCache.get(key);
 if(cached!==undefined)return cached;
 const channels=upChannels(platform),points=[];
 for(const range of upRangeMonths(start,end)){
  const series=channels.map(channel=>upMonthFacts(p,channel,range.month,version)),last=range.last??series[0].days;
  for(let day=range.first;day<=last;day++){
   const point={date:range.month+'-'+String(day).padStart(2,'0')};
   for(let f=0;f<upSummaryFields.length;f++){
    let value=0;for(const month of series)value+=month.columns[f][day]-month.columns[f][day-1];
    point[upSummaryFields[f]]=value;
   }
   points.push(point);
  }
 }
 return upDailyCache.set(key,points,points.length);
}
function upSummary(p,start,end,platform='all'){
 if(!p||start>end||!(Array.isArray(platform)?platform.length&&platform.every(v=>qrPlatforms.includes(v)):['all',...qrPlatforms].includes(platform)))throw new Error('无效的SPU详情查询');
 const version=upFactsVersion(p),key=upFactsKey(p,platform,start,end,version),cached=upSummaryCache.get(key);
 if(cached!==undefined)return cached;
 const totals=upSummaryFields.map(()=>0),channels=upChannels(platform);
 for(const range of upRangeMonths(start,end))for(const channel of channels){
  const month=upMonthFacts(p,channel,range.month,version),last=range.last??month.days;
  for(let f=0;f<totals.length;f++)totals[f]+=month.columns[f][last]-month.columns[f][range.first-1];
 }
 const sum=Object.fromEntries(upSummaryFields.map((field,i)=>[field,totals[i]]));
 const summary={...sum,platform,start,end,
  returnRate:sum.sales?sum.returned/sum.sales*100:null,
  receivedRate:sum.sales?sum.received/sum.sales*100:null,
  contactRate:sum.sales?sum.contacts/sum.sales*100:null,
  qualityContactRate:sum.sales?sum.qualityContacts/sum.sales*100:null,
  experienceContactRate:sum.sales?sum.experienceContacts/sum.sales*100:null,
  badRate:sum.reviews?sum.bad/sum.reviews*100:null,
  feeRate:sum.gsvCents?sum.expenseCents/sum.gsvCents*100:null,
  profitRate:sum.gsvCents?sum.profitCents/sum.gsvCents*100:null};
 Object.defineProperty(summary,'points',{enumerable:true,get:()=>upDaily(p,platform,start,end,version)});
 return upSummaryCache.set(key,summary);
}
