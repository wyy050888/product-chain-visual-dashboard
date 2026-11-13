// 库存余额沿用原台账；周转成本与销量改用统一经营事实。
function upInventoryFacts(record) {
  record=inventoryCoverageSample(record);
  const range=upWindow(), s=upSummary(upIdentity(record),range.start,range.end);
  const avg=record.avg, cost=s.sales*(record.num?record.amountCents/100/record.num:0);
  return {...record,cost,turn:avg?cost/avg:null};
}
const upOriginalInventoryRows=inventoryRows;
inventoryRows=function() {
  const view=invView; let chainsData;
  invView='chain';
  try { chainsData=upOriginalInventoryRows(); } finally { invView=view; }
  const rows=inventorySpuLedgerRows(chainsData).map(upInventoryFacts);
  const group=items=>{
    const sum=key=>items.reduce((n,r)=>n+(r[key]||0),0),avg=sum('avg'),cost=sum('cost');
    const due=sum('due'),on=sum('on'),refDue=sum('refDue'),refOn=sum('refOn');
    return {num:sum('num'),amount:sum('amountCents')/100,stale:sum('staleCents')/100,avg,cost,
      due,on,refDue,refOn,turn:avg?cost/avg:null,delivery:due?on/due*100:null,refurb:refDue?refOn/refDue*100:null};
  };
  if(view==='chain') return chainsData.map((r,i)=>({...r,...group(rows.filter(p=>p.chain===i))}));
  return brands.map((name,i)=>({name,...group(rows.filter(p=>p.brand===i))}));
};
const upOriginalInventoryLedger=inventoryProductLedger;
inventoryProductLedger=function(){return upOriginalInventoryLedger().map(upInventoryFacts)};
function upStockFacts(r) {
  const p=upIdentity(r), range=upWindow(),s=upSummary(p,range.start,range.end);
  const days=Math.max(1,aiFlowDayDiff(range.start,range.end)+1);
  const index=p.sourceRow-1, warehouse=r.num, factory=r.sampleFactoryUnits??Math.round(r.num*(.12+(index%4)*.04));
  const undelivered=r.sampleUndeliveredUnits??Math.round(r.num*(.06+(index%3)*.03)), totalUnits=warehouse+factory+undelivered;
  const financePriceCents=r.num?Math.round(r.amountCents*10000/r.num):0;
  const coverage=s.sales?warehouse/(s.sales/days):null;
  const {dailyNet15,coverage15:slowCoverage,totalCoverage15}=upSellableStock(p,warehouse,range.end,totalUnits);
  const balance=upStockBalanceFacts(r,{warehouse,factory,undelivered,totalUnits,financePriceCents}),metrics=brcStockMetrics({...balance,warehouse,dailyNet15,coverage15:slowCoverage,totalCoverage15});
  const slow=brcStockStagnant({warehouse,dailyNet15,...metrics});
  return {...balance,warehouse,factory,undelivered,totalUnits,financePriceCents,goodsValueCents:Number.isFinite(r.inventoryBalance?.goodsValueCents)?r.inventoryBalance.goodsValueCents:totalUnits*financePriceCents,
    coverage,slowCoverage,slow,dailyNet15,...metrics,sales:s.sales,gsvCents:s.gsvCents,
    staleMaxAgeDays:r.staleOldestReceivedDate?Math.max(0,aiFlowDayDiff(r.staleOldestReceivedDate,range.end)):null,
    staleOldestSellableUnits:r.staleOldestReceivedDate&&Number.isFinite(r.staleOldestSellableUnits)?r.staleOldestSellableUnits:null,
    staleUnits:Number.isFinite(r.staleUnits)?r.staleUnits:r.amountCents?Math.round(r.num*r.staleCents/r.amountCents):0,
    staleValueCents:Math.round(r.staleCents*10000)};
}
const upOriginalSlowRows=srRows;
srRows=function(){return upOriginalSlowRows().map(r=>({...r,...upStockFacts(r)})).filter(r=>r.slow)};

// 平台经营指标使用所选台账；库存余额没有平台归属，保留公司SPU快照。
function upPlatformStockFacts(r,platform='all'){
 const stock=upStockFacts(r);
 if(platform==='all')return {...r,...stock,metricPlatform:platform};
 const p=upIdentity(r),w=upWindow(),s=upSummary(p,w.start,w.end,platform),recent=upSummary(p,shiftDate(w.end,-14),w.end,platform),days=Math.max(1,aiFlowDayDiff(w.start,w.end)+1);
 const dailyNet15=(recent.sales-recent.returned)/15,slowCoverage=dailyNet15>0?stock.warehouse/dailyNet15:null,totalCoverage15=dailyNet15>0?stock.totalUnits/dailyNet15:null,sellableCoverage15=dailyNet15>0?stock.sellableUnits/dailyNet15:null;
 return {...r,...stock,metricPlatform:platform,sales:s.sales,gsvCents:s.gsvCents,sales15:recent.sales,
  coverage:s.sales?stock.warehouse/(s.sales/days):null,coverage15:slowCoverage,totalCoverage15,sellableCoverage15,slowCoverage,slow:brcStockStagnant({...stock,dailyNet15,coverage15:slowCoverage,totalCoverage15,sellableCoverage15}),
  turn:r.avg?s.sales*(r.num?r.amountCents/100/r.num:0)/r.avg:null};
}
function upPlatformStockRisk(r,platform='all'){
 const facts={...upPlatformStockFacts(r,platform),platformMetrics:platform==='all'?r.platformMetrics:r.platformMetrics.filter(p=>p.platform===platform)};
 return {...facts,reasons:irReasons(facts)};
}

// 无销售基数时比率为空，由完整谓词处理缺失值；切换为次数指标时不依赖利润率是否有值。
const upOriginalHighStock=irLedger;
irLedger=function() {
  const w=upWindow();
  return upOriginalHighStock().map(r=>{
    const stock=upStockFacts(r), platformMetrics=qrPlatforms.map(platform=>{
      const s=upSummary(upIdentity(r),w.start,w.end,platform);
      return {platform,profitRate:s.profitRate,returnRate:s.returnRate,receivedRate:s.receivedRate};
    });
    const amount=stock.goodsValueCents/1000000;
    const facts={...r,...stock,amount,staleRatio:amount?r.stale/amount*100:0,platformMetrics};
    const reasons=irReasons(facts);
    return {...facts,reasons,level:reasons.some(x=>x.priority===1)?'P1':reasons.some(x=>x.priority<5)?'P2':'P3',
      desc:reasons.map(irReasonText).join('；')};
  });
};
const upOriginalFixedFacts=rfFacts;
rfFacts=function(k,r) {
  const facts=upOriginalFixedFacts(k,r);
  if(!upIdentity(r)) return facts;
  const w=upWindow(),s=upSummary(upIdentity(r),w.start,w.end,r.lossPlatform||(k===6?r.channel:'all'));
  if(k===4) {
    const days=Math.max(1,aiFlowDayDiff(w.start,w.end)+1),turnDays=r.turn>0?days/r.turn:null;
    return [rfMetric('库存周转天数',turnDays===null?'—':fmt(turnDays,1)+'天',turnDays!==null&&turnDays>=60,'所选周期天数÷库存周转率；滞销入榜另按近15日均净销量计算可售天数≥60天。'),
      rfMetric('滞销库存货值',pfMoneyYuan((r.staleValueCents/1000000)*10000),r.staleValueCents>0,'只计算超库龄部分，沿用库存台账超库龄货值。'),
      rfMetric('期间销量',formatSalesQuantity(s.sales,'件'),false,'所选周期全平台销量；与经营表现及逐日台账一致。'),
      rfMetric('滞销金额',pfMoneyYuan((r.staleValueCents/1000000)*10000),r.staleValueCents>0,'与滞销库存货值为同一超库龄金额，不重复相加。'),
      rfMetric('库存总量',fmt(r.totalUnits)+'件',r.slow,'仓内＋工厂＋新机未交付；近15日净销量＞0且仓内库存÷近15日均净销量≥60天时入滞销榜。'),
      rfMetric('动销率',upPercent(r.warehouse+s.sales?s.sales/(r.warehouse+s.sales)*100:null),false,'期间销量÷（期间销量＋期末仓内库存）；阈值尚未确认，不单独判灯。')];
  }
  if(k===2) {
    facts[1].value=s.profitRate===null?'—':fmt(s.profitRate,1)+'%';
    facts[1].hit=s.profitRate!==null&&s.profitRate<10;
    facts[5].rule=facts[5].rule.replaceAll('已验收入库退货','消费者签收后退货');
  }
  if(k===3) facts[5]=rfMetric('GSV',pfMoneyYuan((s.gsvCents/1000000)*10000),s.gsvCents<s.targetCents,'同期统一净销售额，目标 '+fmt(s.targetCents/1000000,2)+' 万元');
  if(k===6) facts[2].rule=facts[2].rule.replaceAll('已验收入库退货','消费者签收后退货');
  return facts;
};
