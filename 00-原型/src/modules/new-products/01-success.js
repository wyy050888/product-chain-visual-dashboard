// 季度成功只使用当季数据；首次成功后退出后续季度考核，跨年未成功继续滚动。
const nspSuccessCache=boundedCache(1024);
function nspSuccessPeriod(period=periodFor('new')){
 const range=bounds(period),year=Number(range.cutoff.slice(0,4)),quarter=Math.ceil(Number(range.cutoff.slice(5,7))/3);
 const annual=period.mode==='year',month=annual?1:(quarter-1)*3+1;
 const start=period.mode==='quarter'?range.start:annual?range.start:year+'-'+String(month).padStart(2,'0')+'-01';
 return {annual,start,end:range.cutoff,key:annual?String(period.year):start.slice(0,4)+'-Q'+Math.ceil(Number(start.slice(5,7))/3),
  label:annual?String(period.year).slice(-2)+'年':'Q'+Math.ceil(Number(start.slice(5,7))/3),target:brcNumber('new.successRate')};
}
// 年度目标只按上市日至年末的自然天数折算；查询截止日不缩短目标周期。
function nspAnnualGsvPeriod(launch,periodStart){
 const year=Number(periodStart?.slice(0,4));
 if(!Number.isInteger(year)||year<1000||year>9999||!/^\d{4}-\d{2}-\d{2}$/.test(launch||''))return null;
 const launchTime=Date.parse(launch+'T00:00:00Z');
 if(!Number.isFinite(launchTime)||new Date(launchTime).toISOString().slice(0,10)!==launch)return null;
 const yearStart=Date.UTC(year,0,1),nextYear=Date.UTC(year+1,0,1),start=Math.max(yearStart,launchTime);
 if(start>=nextYear)return null;
 const days=(nextYear-start)/86400000,yearDays=(nextYear-yearStart)/86400000;
 return {start:new Date(start).toISOString().slice(0,10),end:year+'-12-31',days,yearDays,ratio:days/yearDays};
}
function nspSuccessPass(facts,season,annual,periodStart,actualLaunch=periodStart){
 const key=season==='四季品'?(annual?'new.yearGsv':'new.quarterGsv'):'new.seasonGsv';
 const calendar=annual?nspAnnualGsvPeriod(actualLaunch,periodStart):null;
 if(annual&&!calendar)return false;
 // GSV除以系数与原条件比较，等价于仅将GSV门槛乘该系数；复用条件缓存，不改实际业绩。
 const metrics={gsv:facts.gsvCents/1000000/(calendar?.ratio||1),profitRate:facts.profitRate,returnRate:facts.returnRate};
 const group=key==='new.seasonGsv'?'success-season':annual?'success-year':'success-quarter';
 const conditions=typeof brcSuccessConditions==='function'?brcSuccessConditions(annual,periodStart):undefined;
 return Number.isFinite(facts.gsvCents)&&brcResultMatch(group,metrics,conditions);
}
function nspAssessmentFacts(product,start,end,includePoints=false){
 const members=product.members||[product];
 if(members.length===1)return upSummary(upIdentity(members[0]),start,end,'all');
 const fields=['gsvCents','profitCents','sales','returned'];
 const facts={gsvCents:0,profitCents:0,sales:0,returned:0},days=new Map();
 for(const member of members){
  if(member.actualLaunch>end)continue;
  const summary=upSummary(upIdentity(member),member.actualLaunch>start?member.actualLaunch:start,end,'all');
  for(const key of fields)facts[key]+=summary[key];
  if(includePoints)for(const point of summary.points){
   if(!days.has(point.date))days.set(point.date,{date:point.date,gsvCents:0,profitCents:0,sales:0,returned:0});
   const daily=days.get(point.date);
   for(const key of fields)daily[key]+=point[key];
  }
 }
 return {...facts,profitRate:facts.gsvCents?facts.profitCents/facts.gsvCents*100:null,
  returnRate:facts.sales?facts.returned/facts.sales*100:null,points:[...days.values()].sort((a,b)=>a.date.localeCompare(b.date))};
}
// 逐日累加本季度台账，记录首次满足条件的日期；不读取截止日之后的数据。
function nspFirstNaturalQuarterSuccess(product,cutoff=DATA_CUTOFF){
 const members=product.members||[product],key=JSON.stringify([product.seriesId||product.spuId,product.actualLaunch,cutoff,upRuleRevision,
  members.map(member=>[member.spuId,member.actualLaunch,upFactsVersion(upIdentity(member))])]);
 const cached=nspSuccessCache.get(key);if(cached!==undefined)return cached;
 let found=null;
 for(let year=Number(product.actualLaunch.slice(0,4));year<=Number(cutoff.slice(0,4))&&!found;year++)for(let q=1;q<=4&&!found;q++){
  const start=year+'-'+String((q-1)*3+1).padStart(2,'0')+'-01';
  const quarterEnd=iso(new Date(Date.UTC(year,q*3,0))),end=quarterEnd<cutoff?quarterEnd:cutoff;
  if(start>end||product.actualLaunch>end)continue;
  const first=product.actualLaunch>start?product.actualLaunch:start;
  let gsvCents=0,profitCents=0,sales=0,returned=0;
  for(const day of nspAssessmentFacts(product,first,end,true).points){
   gsvCents+=day.gsvCents;profitCents+=day.profitCents;sales+=day.sales;returned+=day.returned;
   if(nspSuccessPass({gsvCents,profitRate:gsvCents?profitCents/gsvCents*100:null,returnRate:sales?returned/sales*100:null},pfIdentity(product).attribute,false,start)){
    found={quarter:year+'-Q'+q,date:day.date};break;
   }
  }
 }
 return nspSuccessCache.set(key,found);
}
// 季度特批与自然达标共用退出规则；年度特批不参与季度历史。
function nspFirstQuarterSuccess(product,cutoff=DATA_CUTOFF){
 const natural=nspFirstNaturalQuarterSuccess(product,cutoff),approved=nspFirstQuarterApproval(product,cutoff);
 return !natural?approved:!approved||natural.date<=approved.date?natural:approved;
}
function nspSuccessFact(product,period){
 const first=nspFirstQuarterSuccess(product,period.end),prior=first&&first.date<period.start;
 // 年度以年初为边界排除往年已成功的简称，等价于当年各季度纳入名单的并集。
 // 当年首次成功后仍保留年度资格，年度业绩按全年独立汇总，不累加季度结果。
 const included=period.start<=period.end&&product.actualLaunch<=period.end&&!prior;
 const start=product.actualLaunch>period.start?product.actualLaunch:period.start;
 const facts=included?nspAssessmentFacts(product,start,period.end):null;
 const approval=included?nspApprovalFor(product,period.key,period.end):null;
 return {included,carried:included&&product.actualLaunch<period.start,origin:product.actualLaunch<period.start?'往季滚入':'本季上市',
  success:!!(included&&(approval||(period.annual?nspSuccessPass(facts,pfIdentity(product).attribute,true,period.start,product.actualLaunch):first&&first.quarter===period.key))),approval,
  periodKey:period.key,firstSuccess:first,facts:facts?{gsvCents:facts.gsvCents,profitCents:facts.profitCents,sales:facts.sales,returned:facts.returned,profitRate:facts.profitRate,returnRate:facts.returnRate}:null};
}
function nspSuccessSummary(rows,period=nspSuccessPeriod()){
 const pool=[...new Map(rows.filter(p=>p.successAssessment.included).map(p=>[p.seriesId||p.spuId,p])).values()];
 const success=pool.filter(p=>p.successAssessment.success).length,total=pool.length;
 return {...period,success,total,carried:pool.filter(p=>p.successAssessment.carried).length,rate:total?success/total*100:null};
}
function nspSuccessfulQuarters(product,cutoff=DATA_CUTOFF){
 const first=nspFirstQuarterSuccess(product,cutoff);return first?[first.quarter]:[];
}
function nspSuccessQuarterLabel(key){const [year,q]=key.split('-');return year+'年'+q}
function nspPoolExitDate(successQuarters){
 const first=[...successQuarters].sort()[0];if(!first)return null;
 const [year,q]=first.split('-Q').map(Number);
 return shiftDate(iso(new Date(Date.UTC(year,q*3,0))),brcNumber('new.exitDays'));
}
function nspIsInPool(exitDate,cutoff){return !exitDate||cutoff<exitDate}
function nspPoolStatus(product,cutoff){
 if(!product.members&&typeof nspSeriesBySpu!=='undefined'&&nspSeriesBySpu.has(product.spuId))product=nspSeriesFor(product,cutoff);
 const successQuarters=nspSuccessfulQuarters(product,cutoff),poolExitDate=nspPoolExitDate(successQuarters);
 return {successQuarters,poolExitDate,inNewPool:nspIsInPool(poolExitDate,cutoff)};
}
