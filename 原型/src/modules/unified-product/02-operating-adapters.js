// 原卡片、表格、CSV和详情都走同一台账，保留各模块自身的入榜规则。
qrbMonthData = upQualityData;
qrbCache.clear(); rrCached=null;
const upOriginalProducts = productRows;
productRows = function(isNew) {
  const range=upWindow();
  return upOriginalProducts(isNew).map(record=>{
    const p=upIdentity(record); if(!p) return record;
    const base=upProduct(p), facts=upSummary(p,range.start,range.end);
    return {...record, ...base, days:Math.max(0,aiFlowDayDiff(base.actualLaunch,range.end)+1),
      sales:facts.gmvCents/1000000, profit:facts.profitRate??0, returnRate:facts.returnRate??0,
      units:facts.sales, receivedRate:facts.receivedRate, performanceScope:'company'};
  });
};
newLaunchFacts = function(rows) {
  const b=bounds();
  return rows.map(p=>{
    const actualLaunch=upProduct(upIdentity(p)).actualLaunch;
    const plannedLaunch=shiftDate(actualLaunch,[0,-5,2,0,-3,1][p.id%6]);
    const inPlan=plannedLaunch>=b.start&&plannedLaunch<=b.end;
    const onTime=inPlan&&actualLaunch<=plannedLaunch&&actualLaunch<=b.cutoff;
    return {...p,actualLaunch,plannedLaunch,inPlan,onTime,salesSuccess:onTime&&p.sales>0};
  });
};
riskLossPeriod = function(record) {
  const w=riskRange(), p=upIdentity(record), s=upSummary(p,w.start,w.end,record.lossPlatform||'all');
  return {...w,...s, returned:s.returned, received:s.received, rate:s.returnRate??0,
    receivedRate:s.receivedRate??0, gmv:s.gmvCents/1000000, gsv:s.gsvCents/1000000,
    loss:-s.profitCents/1000000,
    points:s.points.map(d=>({...d,returns:d.returned,gmv:d.gmvCents/1000000,loss:-d.profitCents/1000000,rate:qrRate(d.returned,d.sales)}))};
};
// 退货榜的补充金额、利润不再按另一套价格生成。
rfReturnFacts = function(record) {
  const p=upIdentity(record), s=upSummary(p,record.start,record.end,record.channel);
  const previous=upSummary(p,record.prevStart,record.prevEnd,record.channel);
  return copyFactRecord(s,{previousGsvCents:previous.gsvCents,targetCents:s.targetCents,
    receivedLimit:null});
};
const upOriginalReturnRows = rrAll;
rrAll = function() {
  return upOriginalReturnRows().map(r=>{
    const s=upSummary(upIdentity(r),r.start,r.end,r.channel), prev=upSummary(upIdentity(r),r.prevStart,r.prevEnd,r.channel);
    return copyFactRecord(r,{price:s.sales?s.gmvCents/100/s.sales:0,salesAmount:s.gmvCents/1000000,previousSalesAmount:prev.gmvCents/1000000});
  });
};
nsSalesFacts = function(rows) {
  const w=upWindow();
  return rows.map(p=>{
    const identity=upIdentity(p),base=upProduct(identity);
    const ownership=['公司产品','一类自选','一类一盘货'][p.id%3];
    const meta={...p,shortName:p.name,ownership,productType:ownership==='公司产品'?'自研':'自选',season:base.attribute.replace('季品','季')};
    const platformRows=nsPlatforms.map(platform=>{
      const s=upSummary(identity,w.start,w.end,platform);
      return {...nsSummarize({...meta,platform,actualLaunch:base.actualLaunch,days:p.days},[{...s,units:s.sales,returns:s.returned}]),
        price:s.sales?s.gmvCents/100/s.sales:0};
    });
    const company=upSummary(identity,w.start,w.end);
    return {...nsSummarize({...meta,platform:'全平台汇总'},platformRows),price:company.sales?company.gmvCents/100/company.sales:0,platformRows};
  });
};
const upOriginalTrends = newProductTrendData;
newProductTrendData = function(record,cutoff,days=30,platforms=newTrendPlatforms,launchDate=null) {
  const p=upIdentity(record); if(!p) return upOriginalTrends(record,cutoff,days,platforms,launchDate);
  const start=shiftDate(cutoff,1-days), launch=upProduct(p).actualLaunch;
  return platforms.filter(platform=>qrPlatforms.includes(platform.name)).map(platform=>{
    const s=upSummary(p,start,cutoff,platform.name);
    return {...platform,points:s.points.map(d=>({...d,onSale:d.date>=launch,volume:d.sales,returned:d.returned,
      salesCents:d.gmvCents,profitCents:d.profitCents,revenue:d.gmvCents/1000000,
      returnRate:d.sales?d.returned/d.sales*100:null,margin:d.gsvCents?d.profitCents/d.gsvCents*100:null}))};
  });
};
const upOriginalRiskObservation = riskObservation;
riskObservation = function(k,r) {
  if(![2,3,4].includes(k)||!upIdentity(r)) return upOriginalRiskObservation(k,r);
  const w=riskRange(),s=upSummary(upIdentity(r),w.start,w.end,r.lossPlatform||'all');
  const daily=s.points.map(d=>({...d,sales:d.sales,returns:d.returned}));
  return {start:w.start,cutoff:w.end,shipped:s.sales,returned:s.returned,rate:s.returnRate,unsold:false,points:riskTrendBuckets(daily)};
};
riskInventorySeries = function(r) {
  const w=riskRange(),s=upSummary(upIdentity(r),w.start,w.end);
  return {name:'销量',color:'#7885f5',points:s.points.map(d=>({date:d.date,volume:d.sales}))};
};
// 已收退按消费者签收后发生的退货理解，不用仓库验收进度替代。
const upOriginalRiskRules=rfRuleRows;
rfRuleRows=function(k){return upOriginalRiskRules(k).map(row=>row.map(value=>typeof value==='string'?value.replaceAll('已验收入库退货','消费者签收后退货'):value))};
