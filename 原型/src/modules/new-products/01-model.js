// 新品明细以SPU为一行，经营数据统一按全公司汇总，渠道仅用于筛选产品。
const nspFilters={query:'',brand:'all',channel:'all',salesChannel:'all',status:'all',grade:'all',success:'all',successQuarter:'all',season:'all',price:'all',min:'',max:'',launchStart:'',launchEnd:''};
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
// 自动销售状态复用详情库存风险；整改、清仓、下架保留人工业务状态。
function nspSalesState(state,stock){
 if(!['在售','滞销','缺货'].includes(state))return state;
 const tags=upStockRiskTags(stock);
 if(tags.includes('shortage'))return '缺货';
 if(tags.includes('stagnant'))return '滞销';
 // 库存或正净销量缺失时不推断恢复在售。
 if(!Number.isFinite(stock?.coverage15)||!Number.isFinite(stock?.totalCoverage15))return state;
 return '在售';
}
function nspRows(){
 const b=bounds(),days=aiFlowDayDiff(b.start,b.cutoff)+1,previousEnd=shiftDate(b.start,-1),previousStart=shiftDate(b.start,-days);
 const successPeriod=nspSuccessPeriod();
 // 库存与产品详情共用最新公司快照和全平台近15日均净销量，不按渠道分摊。
 const stockBySpu=upWithRange({start:shiftDate(DATA_CUTOFF,-29),end:DATA_CUTOFF},()=>new Map(inventoryProductLedger().map(r=>[r.spuId,upStockFacts(r)])));
 return newLaunchFacts(productRows(true)).filter(p=>p.actualLaunch<=b.cutoff).map(p=>{
  const identity=upIdentity(p),current=upSummary(identity,b.start,b.cutoff,'all'),previous=upSummary(identity,previousStart,previousEnd,'all');
  // 价格带沿用关键产品：截止日近30天成交金额÷未扣退销量，不随季度长度改变。
  const priceFacts=upSummary(identity,shiftDate(b.cutoff,-29),b.cutoff,'all'),priceCents=priceFacts.sales>0?Math.round(priceFacts.gmvCents/priceFacts.sales):null;
  const channelFacts=qrPlatforms.map(channel=>{
   const {gsvCents,sales,returned,received,profitCents}=upSummary(identity,b.start,b.cutoff,channel);
   return {channel,gsvCents,sales,returned,received,profitCents};
  });
  // 按上线至统计截止日的实际销售记录识别全部销售渠道，当前期零销量不移除历史渠道。
  const salesChannels=qrPlatforms.filter(channel=>upSummary(identity,p.actualLaunch,b.cutoff,channel).sales>0);
  const successAssessment=nspSuccessFact(p,successPeriod);
  const successQuarters=nspSuccessfulQuarters(p,b.cutoff);
  const poolExitDate=nspPoolExitDate(successQuarters),inNewPool=nspIsInPool(poolExitDate,b.cutoff);
  const stock=stockBySpu.get(p.spuId),sellableStock={...upSellableStock(identity,stock?.warehouse??null,DATA_CUTOFF,stock?.totalUnits??null),warehouseValueCents:stock?.warehouseValueCents??null};
  // 延期按实际上线日与计划日比较，不受当前统计季度影响。
  const launchDelayDays=Math.max(0,aiFlowDayDiff(p.plannedLaunch,p.actualLaunch));
  return {...p,state:nspSalesState(p.state,sellableStock),category:pfCategory(p),season:pfIdentity(p).attribute,priceCents,current,previous,channelFacts,salesChannels,grade:nspGrade(current),successAssessment,successQuarters,sellableStock,
   launchDelayDays,poolExitDate,inNewPool,salesSuccess:successAssessment.success,returnTarget:rpLossReturnTarget(identity,'all',b.start,b.cutoff)};
 }).sort((a,b)=>a.actualLaunch.localeCompare(b.actualLaunch)||a.spuCode.localeCompare(b.spuCode));
}
function nspCategoryRows(){
 const selected=pfControlValue($('#newchain'));
 return nspRows().filter(p=>pfIncludes(selected,p.category)&&pfIncludes(nspFilters.season,pfIdentity(p).attribute));
}
// 搜索筛选共用同一产品范围；考核纳入与在池分布仍按各自业务口径计算。
function nspFilterRows(rows,filters=nspFilters){
 const query=filters.query.trim().toLocaleLowerCase();
 return rows.filter(p=>(!query||[p.name,p.spuCode,p.model].some(v=>String(v||'').toLocaleLowerCase().includes(query)))
  &&kpmPriceMatch(p,filters)&&pfIncludes(filters.brand,p.brand)
  &&(filters.channel==='all'||p.salesChannels.includes(filters.channel))
  &&(filters.salesChannel==='all'||p.salesChannels.includes(filters.salesChannel))
  &&(!filters.launchStart||p.actualLaunch>=filters.launchStart)
  &&(!filters.launchEnd||p.actualLaunch<=filters.launchEnd)
  &&(filters.status==='all'||p.state===filters.status)
  &&(filters.grade==='all'||p.grade===filters.grade)
  &&(filters.success==='all'||(p.successAssessment.included&&p.salesSuccess===(filters.success==='成功')))
  &&(!pfSelected(filters.successQuarter).length||p.successQuarters.some(q=>pfIncludes(filters.successQuarter,q))));
}
function nspVisibleRows(rows){
 const filtered=nspFilterRows(rows).filter(p=>p.inNewPool&&(newProductSelection.metric==='all'||(newProductSelection.metric==='sold'?p.salesSuccess:p.onTime)));
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
window.dashboardNewProductsSnapshot=()=>withPeriod('new',()=>{const rows=nspCategoryRows();return {period:{...periodFor('new')},rows,visible:nspVisibleRows(rows),filtered:nspFilterRows(rows),priceDistribution:nspPriceDistributionRows(rows),success:nspSuccessSummary(nspFilterRows(rows)),filters:{...nspFilters},metric:newProductSelection.metric,timeliness:nspDeliverySummary()}});
