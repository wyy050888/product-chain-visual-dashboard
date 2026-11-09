// 全平台按SPU合并；平台筛选只缩小有该平台品质处罚的产品集合，排序始终读取全平台事实。
function qfViolationObservation(product,platform,start,end,observations=null){
 if(platform!=='all'&&!Array.isArray(platform))return qrObservation(product,platform,start,end);
 const parts=(observations||qrPlatforms.map(channel=>qrObservation(product,channel,start,end))).filter(row=>platform==='all'||platform.includes(row.platform));
 const base=qrObservation(product,'all',start,end),m=base.monthly;
 const events=parts.flatMap(row=>row.monthly.events.map(event=>({...event,platform:row.platform})));
 const allEvents=parts.flatMap(row=>(row.monthly.allEvents||row.monthly.events).map(event=>({...event,platform:row.platform})));
 const amount=type=>events.filter(event=>event.type===type).reduce((sum,event)=>sum+(Number(event.amount)||0),0);
 const [frozenCount,fineCount,offShelf,dropCount]=qfViolationCounts({events}),risks=qfViolationRisks({events});
 const current=Array.isArray(platform)?upSummary(upIdentity(product),start,end,platform):m.current,previous=Array.isArray(platform)?upSummary(upIdentity(product),m.previousStart,m.previousEnd,platform):m.previous;
 const monthly={...m,current,previous,events,allEvents,frozen:amount('资金冻结'),fine:amount('罚款'),frozenCount,fineCount,offShelf,dropCount,risks,penaltyHit:risks.length>0,
  target:rpLossReturnTarget(upIdentity(product),platform,start,end)};
 return copyFactRecord(base,{key:product.id+':-1',platform,monthly,risks,penalty:monthly.penaltyHit,offShelf:offShelf>0});
}
function qfViolationSpuRows(platform,start,end){
 return qrCatalog().flatMap(product=>{
  const observations=qrPlatforms.map(channel=>qrObservation(product,channel,start,end));
  const events=observations.flatMap(row=>row.monthly.events),risks=qfViolationRisks({events});
  if(!risks.length)return [];
  const violatedPlatforms=observations.filter(row=>qfViolationRisks(row.monthly).length).map(row=>row.platform);
  if(platform!=='all'&&!(Array.isArray(platform)?platform.some(channel=>violatedPlatforms.includes(channel)):violatedPlatforms.includes(platform)))return [];
  const record=qfViolationObservation(product,platform,start,end,observations);
  const gsv30=upSummary(upIdentity(product),shiftDate(end,-29),end,'all').gsvCents;
  const ranking=qfViolationSortFacts({monthly:{events},spuGsv30Cents:gsv30});
  return [copyFactRecord(record,record.monthly.current,{violationRanking:ranking,violatedPlatforms})];
 }).sort(qfViolationCompare);
}
// 抽屉按SPU×平台列明细；沿用产品榜顺序，各行经营/处罚事实独立取本平台。
function qfViolationPlatformRows(platform,start,end){
 const products=new Map(qrCatalog().map(product=>[String(product.id),product]));
 return qfViolationSpuRows(platform,start,end).flatMap(record=>{
  const product=products.get(record.key.split(':')[0]);
  return qrPlatforms.filter(channel=>record.violatedPlatforms.includes(channel)&&pfIncludes(platform,channel))
   .map(channel=>qrObservation(product,channel,start,end));
 });
}
qrRows=function(platform=qrState.platform,start=qrWindow().start,end=qrWindow().end){return qfViolationSpuRows(platform,start,end)};
window.qualityViolationRankingSnapshot=()=>withPeriod('risk',()=>{
 const platform=qrState.platform,{start,end}=qrWindow(),records=qrRows(platform);
 return {platform,start,end,rule:rpCardRuleSummary(0),rows:records.map(row=>row.key),records:records.map(row=>({key:row.key,spuId:row.spuId,platform:row.platform,violatedPlatforms:row.violatedPlatforms,facts:qfViolationSortFacts(row)})),
  candidates:qrCatalog().flatMap(product=>qrPlatforms.map(channel=>{const row=qrObservation(product,channel,start,end);return {key:row.key,spuId:row.spuId,platform:channel,risks:row.risks,contactHit:row.monthly.contactHit,returnHit:row.monthly.returnHit,facts:qfViolationSortFacts(row)}}))};
});
