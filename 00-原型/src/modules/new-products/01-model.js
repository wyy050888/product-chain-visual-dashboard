// 新品明细以产品简称为一行，渠道筛选保留全渠道业绩。
const nspFilters={query:'',brand:'all',channel:'all',status:'all',developmentType:'all',success:'all',season:'all',price:'all',min:'',max:'',launchStart:'',launchEnd:''};
function nspPageSize(){return listPageSize('newcount',10)}
const nspSort={key:'launch',direction:'asc'};
const nspSortValues={launch:p=>Date.parse(p.actualLaunch),days:p=>p.days,gsv:p=>p.current.gsvCents,
 netSales:p=>p.current.sales-p.current.returned,profit:p=>p.current.profitRate,
 returns:p=>p.current.returnRate,received:p=>p.current.receivedRate,unreceived:p=>upUnreceivedRate(p.current),warehouse:p=>p.sellableStock.warehouse,guidePrice:p=>p.guidePriceCents};
// 自动销售状态复用详情库存风险；整改、迭代、清仓、下架保留人工业务状态。
function nspSalesState(state,stock){
 if(!['在售','滞销','缺货'].includes(state))return state;
 const tags=upStockRiskTags(stock);
 if(tags.includes('shortage'))return '缺货';
 if(tags.includes('stagnant'))return '滞销';
 // 库存或正净销量缺失时不推断恢复在售。
 if(!Number.isFinite(stock?.coverage15)||!Number.isFinite(stock?.totalCoverage15))return state;
 return '在售';
}
const nspRowsCache=boundedCache(10);
let nspRowsInputs;
function nspRows(range=null){
 const b=range||bounds();
 const successPeriod={...nspSuccessPeriod(),end:b.cutoff};
 const inputs=[dpStore,qrbTargets,brcSaved,upRuleRevision,nspApprovalRevision];
 if(inputs.some((value,index)=>value!==nspRowsInputs?.[index])){
  nspRowsCache.clear();nspRowsInputs=inputs;
 }
 // 部门视角可能临时替换产品来源，避免与总看板共用该次快照。
 const key=JSON.stringify([pcChain(),b.start,b.cutoff,successPeriod.start,successPeriod.key,successPeriod.annual]);
 if(!dxDepth){const cached=nspRowsCache.get(key);if(cached!==undefined)return cached}
 const days=aiFlowDayDiff(b.start,b.cutoff)+1,previousEnd=shiftDate(b.start,-1),previousStart=shiftDate(b.start,-days);
 // 库存与产品详情共用最新公司快照和全平台近15日均净销量，不按渠道分摊。
 const stockBySpu=upWithRange({start:shiftDate(DATA_CUTOFF,-29),end:DATA_CUTOFF},()=>new Map(inventoryProductLedger().map(r=>[r.spuId,upStockFacts(r)])));
 const memberRows=newLaunchFacts(productRows(true)).filter(p=>p.actualLaunch<=b.cutoff).map(p=>{
  const identity=upIdentity(p),current=upSummary(identity,b.start,b.cutoff,'all'),previous=upSummary(identity,previousStart,previousEnd,'all');
  // 价格带沿用关键产品：截止日近30天成交金额÷未扣退销量，不随季度长度改变。
  const priceFacts=upSummary(identity,shiftDate(b.cutoff,-29),b.cutoff,'all'),priceCents=priceFacts.sales>0?Math.round(priceFacts.gmvCents/priceFacts.sales):null;
  const platformFacts=qrPlatforms.map(platform=>upSummary(identity,b.start,b.cutoff,platform));
  // 新品渠道展示实际有历史销售的平台，不经过内部销售大区字典过滤。
  const salesChannels=qrPlatforms.filter(platform=>upSummary(identity,p.actualLaunch,b.cutoff,platform).sales>0);
  const stock=stockBySpu.get(p.spuId),sellableStock={...upSellableStock(identity,stock?.warehouse??null,DATA_CUTOFF,stock?.totalUnits??null),warehouseValueCents:stock?.warehouseValueCents??null};
  // 延期按实际上线日与计划日比较，不受当前统计季度影响。
  const launchDelayDays=Math.max(0,aiFlowDayDiff(p.plannedLaunch,p.actualLaunch));
  // 此列为抖音指导价口径，原型复用已有指导价样例，不使用成交均价。
  return {...p,guidePriceCents:upProduct(identity).guidePriceCents,state:nspSalesState(p.state,sellableStock),category:pfCategory(p),season:pfIdentity(p).attribute,
   priceCents,priceFacts,current,previous,platformFacts,salesChannels,sellableStock,launchDelayDays,returnTarget:rpLossReturnTarget(identity,'all',b.start,b.cutoff)};
 });
 const bySpu=new Map(memberRows.map(row=>[row.spuId,row])),seriesRows=new Map();
 for(const row of memberRows){
  const series=nspSeriesFor(row,b.cutoff);
  if(seriesRows.has(series.seriesId))continue;
  const members=series.members.map(member=>bySpu.get(member.spuId)).filter(Boolean);
  const product={...nspMergeSeriesRows(members),seriesId:series.seriesId,shortName:series.shortName,developmentType:series.developmentType,
   members:members.map(({spuId,spuCode,name,model,actualLaunch})=>({spuId,spuCode,name,model,actualLaunch}))};
  const successAssessment=nspSuccessFact(product,successPeriod),pool=nspPoolStatus(product,b.cutoff);
  seriesRows.set(product.seriesId,{...product,...pool,successAssessment,salesSuccess:successAssessment.success});
 }
 const rows=[...seriesRows.values()].sort((a,b)=>a.actualLaunch.localeCompare(b.actualLaunch)||a.spuCode.localeCompare(b.spuCode));
 return dxDepth?rows:nspRowsCache.set(key,rows);
}
function nspCategoryRows(season=nspFilters.season,range=null){
 const selected=pfControlValue($('#newchain'));
 return nspRows(range).filter(p=>pfIncludes(selected,p.category)&&pfIncludes(season,pfIdentity(p).attribute));
}
// 搜索筛选共用同一产品范围；考核纳入与在池分布仍按各自业务口径计算。
// 主表成功状态固定读取历史季度记录；年度复核独立展示。
function nspDisplaySuccess(product){return product.successQuarters.length>0}
function nspFilterRows(rows,filters=nspFilters){
 const query=filters.query.trim().toLocaleLowerCase();
 return rows.filter(p=>(!query||nspMatchesProduct(p,query))
  &&kpmPriceMatch(p,filters)&&pfIncludes(filters.brand,p.brand)
  &&(filters.channel==='all'||p.salesChannels.includes(filters.channel))
  &&(!filters.launchStart||p.actualLaunch>=filters.launchStart)
  &&(!filters.launchEnd||p.actualLaunch<=filters.launchEnd)
  &&(filters.status==='all'||p.salesStates.includes(filters.status))
  &&pfIncludes(filters.developmentType,p.developmentType)
  &&(filters.success==='all'||nspDisplaySuccess(p)===(filters.success==='成功')));
}
// 成功率卡片忽略自身成功状态，避免选中成功后分母缩成成功数量。
function nspSuccessScope(rows){return nspFilterRows(rows,{...nspFilters,success:'all',launchStart:'',launchEnd:''})}
function nspVisibleRows(rows){
 const filtered=nspFilterRows(rows).filter(p=>p.inNewPool);
 // 先对全部筛选结果排序再分页；使用原始数值，缺失值始终置后。
 return rpSortRows(filtered,nspSort,(p,key)=>nspSortValues[key](p));
}
function nspOperatingTotals(rows){
 let gsvCents=0,profitCents=0;
 for(const {current} of rows){
  gsvCents+=current.gsvCents;
  profitCents+=current.profitCents;
 }
 return {gsvCents:rows.length?gsvCents:null,profitRate:gsvCents>0?profitCents/gsvCents*100:null};
}
function nspComparison(value,previous,{margin=false}={}){
 if(margin)return rpProfitRateComparison(value,previous);
 const change=rpQualityChangeValue(value,previous);
 return {target:rpComparisonText(change),targetTone:rpComparisonTone(change)};
}
function nspMetrics(p){
 const c=p.current,b=p.previous;
 return [
  {key:'gsv',value:rpQualityMoney(c.gsvCents/100),...nspComparison(c.gsvCents,b.gsvCents)},
  {key:'netSales',value:formatSalesQuantity(c.sales-c.returned),...nspComparison(c.sales-c.returned,b.sales-b.returned)},
  {key:'margin',value:upPercent(c.profitRate),...nspComparison(c.profitRate,b.profitRate,{margin:true})},
  {key:'return',value:upPercent(c.returnRate),...rpQualityReturnRule(c.returnRate,p.returnTarget)},
  {key:'received',value:upPercent(c.receivedRate),...rpQualityReturnRule(c.receivedRate,null,'received')},
  {key:'unreceived',value:upPercent(upUnreceivedRate(c)),...rpRiskRateComparison(upUnreceivedRate(c),upUnreceivedRate(b))}
 ].map(f=>rpListCell({tone:'',...f}));
}
// 供后台检查核对明细与统一台账，不改变页面数据。
window.dashboardNewProductsSnapshot=()=>withPeriod('new',()=>{const rows=nspCategoryRows();return {period:{...periodFor('new')},rows,visible:nspVisibleRows(rows),filtered:nspFilterRows(rows),priceDistribution:nspPriceDistributionRows(rows),successScope:nspSuccessScope(rows),success:nspSuccessSummary(nspSuccessScope(rows)),filters:{...nspFilters},metric:newProductSelection.metric,timeliness:nspDeliverySummary()}});
