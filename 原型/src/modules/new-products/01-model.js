// 新品明细以SPU为一行，经营数据统一按全公司汇总，渠道仅用于筛选产品。
const nspFilters={query:'',brand:'all',channel:'all',salesChannel:'all',status:'all',grade:'all',success:'all',successQuarter:'all',season:'all',launchStart:'',launchEnd:''};
const NSP_PAGE_SIZE=10;
const nspGrades=['S','A','B','C'];
const nspSort={key:'launch',direction:'asc'};
const nspSortValues={launch:p=>Date.parse(p.actualLaunch),days:p=>p.days,gsv:p=>p.current.gsvCents,
 netSales:p=>p.current.sales-p.current.returned,profit:p=>p.current.profitRate,
 returns:p=>p.current.returnRate,received:p=>p.current.receivedRate,warehouse:p=>p.sellableStock.warehouse};
function nspGrade(facts){
 const highSales=facts.gsvCents/1000000>=config.high,highProfit=facts.profitRate>=config.profit;
 return highSales?(highProfit?'S':'A'):(highProfit?'B':'C');
}
function nspRows(){
 const b=bounds(),days=aiFlowDayDiff(b.start,b.cutoff)+1,previousEnd=shiftDate(b.start,-1),previousStart=shiftDate(b.start,-days);
 const successPeriod=nspSuccessPeriod();
 // 库存与产品详情共用最新公司快照和全平台近15日均净销量，不按渠道分摊。
 const stockBySpu=upWithRange({start:shiftDate(DATA_CUTOFF,-29),end:DATA_CUTOFF},()=>new Map(inventoryProductLedger().map(r=>[r.spuId,r.num])));
 return newLaunchFacts(productRows(true)).filter(p=>p.actualLaunch<=b.cutoff).map(p=>{
  const identity=upIdentity(p),current=upSummary(identity,b.start,b.cutoff,'all'),previous=upSummary(identity,previousStart,previousEnd,'all');
  const channelFacts=qrPlatforms.map(channel=>{
   const {gsvCents,sales,returned,received,profitCents}=upSummary(identity,b.start,b.cutoff,channel);
   return {channel,gsvCents,sales,returned,received,profitCents};
  });
  // 按上线至统计截止日的实际销售记录识别全部销售渠道，当前期零销量不移除历史渠道。
  const salesChannels=qrPlatforms.filter(channel=>upSummary(identity,p.actualLaunch,b.cutoff,channel).sales>0);
  const successAssessment=nspSuccessFact(p,successPeriod);
  const successQuarters=nspSuccessfulQuarters(p,b.cutoff);
  const poolExitDate=nspPoolExitDate(successQuarters),inNewPool=nspIsInPool(poolExitDate,b.cutoff);
  const sellableStock=upSellableStock(identity,stockBySpu.get(p.spuId)??null,DATA_CUTOFF);
  // 延期按实际上线日与计划日比较，不受当前统计季度影响。
  const launchDelayDays=Math.max(0,aiFlowDayDiff(p.plannedLaunch,p.actualLaunch));
  return {...p,category:pfCategory(p),current,previous,channelFacts,salesChannels,grade:nspGrade(current),successAssessment,successQuarters,sellableStock,
   launchDelayDays,poolExitDate,inNewPool,salesSuccess:successAssessment.success,returnTarget:rpLossReturnTarget(identity,'all',b.start,b.cutoff)};
 }).sort((a,b)=>a.actualLaunch.localeCompare(b.actualLaunch)||a.spuCode.localeCompare(b.spuCode));
}
function nspCategoryRows(){
 const selected=pfControlValue($('#newchain'));
 return nspRows().filter(p=>pfIncludes(selected,p.category)&&pfIncludes(nspFilters.season,pfIdentity(p).attribute));
}
function nspVisibleRows(rows){
 const query=nspFilters.query.trim().toLocaleLowerCase();
 const filtered=rows.filter(p=>p.inNewPool&&(!query||[p.name,p.spuCode,p.model].some(v=>String(v||'').toLocaleLowerCase().includes(query)))
  &&pfIncludes(nspFilters.brand,p.brand)
  &&(nspFilters.channel==='all'||p.salesChannels.includes(nspFilters.channel))
  &&(nspFilters.salesChannel==='all'||p.salesChannels.includes(nspFilters.salesChannel))
  &&(!nspFilters.launchStart||p.actualLaunch>=nspFilters.launchStart)
  &&(!nspFilters.launchEnd||p.actualLaunch<=nspFilters.launchEnd)
  &&(nspFilters.status==='all'||p.state===nspFilters.status)
  &&(nspFilters.grade==='all'||p.grade===nspFilters.grade)
  &&(nspFilters.success==='all'||(p.successAssessment.included&&p.salesSuccess===(nspFilters.success==='成功')))
  &&(!pfSelected(nspFilters.successQuarter).length||p.successQuarters.some(q=>pfIncludes(nspFilters.successQuarter,q)))
  &&(newProductSelection.metric==='all'||(newProductSelection.metric==='sold'?p.salesSuccess:p.onTime)));
 // 先对全部筛选结果排序再分页；使用原始数值，缺失值始终置后。
 return rpSortRows(filtered,nspSort,(p,key)=>nspSortValues[key](p));
}
function nspComparison(value,previous,margin=false){
 const change=margin&&Number.isFinite(value)&&Number.isFinite(previous)&&previous!==0?(value-previous)/Math.abs(previous)*100:rpQualityChangeValue(value,previous);
 return {target:rpComparisonText(change),targetTone:rpComparisonTone(change)};
}
function nspMetrics(p){
 const c=p.current,b=p.previous;
 return [
  {value:rpQualityMoney(c.gsvCents/100),...nspComparison(c.gsvCents,b.gsvCents)},
  {value:fmt(c.sales-c.returned),...nspComparison(c.sales-c.returned,b.sales-b.returned)},
  {value:upPercent(c.profitRate),tone:c.profitRate<0?'rp-quality-red':'',...nspComparison(c.profitRate,b.profitRate,true)},
  {value:upPercent(c.returnRate),...rpQualityReturnRule(c.returnRate,p.returnTarget)},
  {value:upPercent(c.receivedRate),...rpQualityReturnRule(c.receivedRate,8)}
 ].map(f=>rpListCell({tone:'',...f}));
}
// 供后台检查核对明细与统一台账，不改变页面数据。
window.dashboardNewProductsSnapshot=()=>withPeriod('new',()=>{const rows=nspCategoryRows();return {period:{...periodFor('new')},rows,visible:nspVisibleRows(rows),success:nspSuccessSummary(rows),filters:{...nspFilters},metric:newProductSelection.metric}});
