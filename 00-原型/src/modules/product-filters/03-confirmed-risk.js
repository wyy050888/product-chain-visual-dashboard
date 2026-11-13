// 更新结论：库存只看公司，余额读最新样例快照，周转默认近30日。
function rpCompanyStockRows(){
 const previous=localPeriods.risk;
 localPeriods.risk={mode:'day',year:+DATA_CUTOFF.slice(0,4),value:+DATA_CUTOFF.slice(5,7),start:shiftDate(DATA_CUTOFF,-29),end:DATA_CUTOFF};
 try{return withPeriod('risk',()=>irLedger().map(r=>{
  const p=upIdentity(r),s=upSummary(p,shiftDate(DATA_CUTOFF,-29),DATA_CUTOFF),month=DATA_CUTOFF.slice(0,7)+'-01';
  const product=upProduct(p);
  const violation=qrPlatforms.reduce((n,platform)=>{const m=qrbMonthly(product,platform,DATA_CUTOFF,month);return n+Number(m.offShelf||0)+(m.events||[]).filter(e=>e.type==='资金冻结').length},0);
  const facts={...r,...upPlatformStockFacts(r,'all'),violation:brcMatch('stock.violations',violation)?'红色':'正常',violationCount:violation,platformMetrics:[{platform:'全公司',profitRate:s.profitRate,returnRate:s.returnRate,receivedRate:s.receivedRate}],snapshotDate:DATA_CUTOFF};
  return {...facts,reasons:irReasons(facts)};
 }).filter(r=>r.reasons.length&&r.totalUnits>0).sort((a,b)=>b.goodsValueCents-a.goodsValueCents))}finally{if(previous)localPeriods.risk=previous;else delete localPeriods.risk}
}
const rpDecideBeforeConfirmed=sbDecide;
sbDecide=function(s){
 const base=rpDecideBeforeConfirmed(s),score=sbScoreRisk(s);
 const signals=base.signals.filter(x=>!/店铺分命中|期间品质处罚|核心链接中/.test(x.label));
 if(score==='red'&&brcMatch('shops.penalties',s.qualityPenaltyCount,s))signals.push({color:'red',label:'店铺评分红灯且当月品质处罚'+brcDescribe('shops.penalties')});
 return {signals,color:signals.some(x=>x.color==='red')?'red':signals.some(x=>x.color==='yellow')?'yellow':'green'};
};
sbReturnRisk=function(p){return rpShopProblemHit(p)};
// 店铺规则的旧详情入口与榜单问号共用同一份说明，避免文案遗漏。
sbRules=function(){return rpCardRuleSummary(1)};

// 事件按所属平台的可用类型取数；缺失类型不参与入榜、排序与金额合计。
const rpMonthlyBeforeConfirmed=qrbMonthly;
qrbMonthly=function(...args){
 const original=rpMonthlyBeforeConfirmed(...args),platform=args[1],raw=qfPreviousMonthly(...args);
 const dropped=raw.events.filter(e=>e.type==='掉权');
 const {returnHit}=qrbQualityDecision(original.current,original.previous);
 // 进线判定保留供指标展示，产品违规榜仅由四类品质处罚入榜。
 const contactHit=qrbContactDecision(original.current.contactRate,original.previous.contactRate,{orders:original.current.orders,returnDelta:periodRateGrowth(original.current.returnRate,original.previous.returnRate)}).hit;
 const events=rpPlatformViolationEvents([...original.events,...dropped],platform,platform);
 const amount=type=>events.filter(e=>e.type===type).reduce((sum,e)=>sum+(Number(e.amount)||0),0);
 const fine=amount('罚款'),frozen=amount('资金冻结'),offShelf=events.filter(e=>e.type==='下架').length,dropCount=events.filter(e=>e.type==='掉权').length;
 // 保留旧五指标下标供详情复用；退货率不再触发入榜。
 const hits=[events.some(event=>event.type==='罚款'),events.some(event=>event.type==='资金冻结'),offShelf+dropCount>0,false,contactHit];
 const risks=qfViolationRisks({events});
 const linked=qrbViolationLinkFacts(args[0],platform,events,original.end);
 const allEvents=rpPlatformViolationEvents([...events,...qrbNonQualityEvents(args[0],platform,original.start,original.end)],platform,platform).sort((a,b)=>a.date.localeCompare(b.date));
 const result={...original,supported:true,returnHit,contactHit,fine,frozen,offShelf,events,allEvents,dropCount,hits,risks,relatedLinks:linked.links,relatedLinkGsv30Cents:linked.gsvCents,penaltyHit:hits.slice(0,3).some(Boolean)};
 return {...result,priority:qfViolationSortFacts({monthly:result}).priority};
};
sbPanel=function(s){
 const score=sbScoreRisk(s),period=rpShopReturnPeriod(s.end||bounds().cutoff);
 const scoreValue=s.channel==='拼多多'?(score==='red'?'核心链接红灯':'未命中红灯'):fmt(s.score,2)+'分';
 const rows=[['评分红灯与当月品质处罚',scoreValue+' / '+s.qualityPenaltyCount+'次','两者同时满足',score==='red'&&brcMatch('shops.penalties',s.qualityPenaltyCount,s)],['当月纯品质罚款',pfMoneyYuan(s.qualityFine),''+brcDescribe('shops.fine')+'，不含冻结',brcMatch('shops.fine',s.qualityFine,s)],['资金冻结',pfMoneyYuan(s.frozenAmount),'按现有资金冻结规则',s.frozenAmount>0],['单品两周期退货恶化',s.returnProducts.filter(sbReturnRisk).length+'个SPU',rpShopReturnRule(),s.returnProducts.some(sbReturnRisk)]];
 if(s.channel==='视频号')rows.shift();
 return '<section class="sb-business"><h3>店铺品质风险依据</h3>'+table(['判定项','当前样例数据','执行条件','结果'],rows.map(([a,b,c,hit])=>[a,b,c,hit?'命中':'未命中']))+'<h4>单品退货 · 稳定周对比</h4>'+table(['产品','上期实际总退','本期实际总退','两期目标','判定结果'],s.returnProducts.map(r=>[esc(r.name),upPercent(r.previous),upPercent(r.current),upPercent(r.target),sbReturnRisk(r)?'本期恶化':'未命中']))+`<p class="note">本期：${period.start} ~ ${period.end}；上期：${period.previousStart} ~ ${period.previousEnd}。</p><details><summary>业务规则</summary><p>${sbRules()}</p></details></section>`;
};


// 详情库存沿用最新公司快照、近30日周转；经营页继续使用入口日期和平台。
// 同步分析一批产品时复用公司清单；finally释放，不跨期间、规则修改或用户操作留存。
let pfCompanyStockBatch=null;
function pfWithCompanyStockBatch(read){
 if(pfCompanyStockBatch)return read();
 pfCompanyStockBatch={};
 try{return read()}finally{pfCompanyStockBatch=null}
}
function pfCompanyStockModel(state){
 const range={start:shiftDate(DATA_CUTOFF,-29),end:DATA_CUTOFF,platform:'all'};
 return upWithRange(range,()=>{
  const batch=pfCompanyStockBatch;
  if(batch&&!batch.ledger)batch.ledger=new Map(inventoryProductLedger().map(row=>[row.spuId,row]));
  const ledger=batch?batch.ledger.get(state.spuId):inventoryProductLedger().find(r=>r.spuId===state.spuId);
  const stock=ledger?upPlatformStockFacts(ledger,'all'):null;
  if(batch&&!batch.risks)batch.risks=new Map(rpCompanyStockRows().map(row=>[row.spuId,row]));
  const highStock=(batch?batch.risks.get(state.spuId):rpCompanyStockRows().find(r=>r.spuId===state.spuId))||null;
  return {stock,highStock,stockSummary:upSummary(upSpus.get(state.spuId),range.start,range.end,'all'),stockEnd:range.end};
 });
}
irRules=function(){return '库存仅按全公司统计，不按平台筛选。余额读取最新样例快照，周转使用近30日。总库存＝仓内＋工厂＋新机未交付；货值按含税含品牌财务价计算。高危库存条件组（'+brcResultText('stock-platform')+'）或滞销命中即入榜。多个命中不重复计库存；当前按货值降序，排序优先级冲突待补充。批次库龄和实时业务库存台账尚未接入。'};

// 所选期间平台净销量先满足门槛，再判断退货增长；处罚不独立触发入榜。
rrRows=function(){
 const w=upWindow();
 const rows=rrAll().filter(r=>pfIncludes(rrState.platform,r.channel)).map(r=>{
  const m=qrbMonthly(upProduct(upIdentity(r)),r.channel,w.end,w.start);
  const fineEvents=m.events.filter(e=>e.type==='罚款'),penaltyCount=m.events.length,penaltyMetrics={qualityPenaltyCount:penaltyCount,qualityFine:m.fine};
  const fineHit=fineEvents.some(e=>brcMatch('shops.fine',Number(e.amount),penaltyMetrics));
  const violation=brcMatch('shops.penalties',m.offShelf,penaltyMetrics)||fineHit||brcMatch('shops.penalties',penaltyCount,penaltyMetrics);
  const returnGap=r.returnRate-m.target,receivedGap=null;
  const s=upSummary(upIdentity(r),w.start,w.end,r.channel),netSales=Number.isFinite(s.sales)&&Number.isFinite(s.returned)?s.sales-s.returned:null;
  const risks=pfReturnCauses(copyFactRecord(r,{netSales}));
  return copyFactRecord(r,{returnTarget:m.target,receivedTarget:null,returnGap,receivedGap,qualityViolation:violation,qualityFine:m.fine,gsvCents:s.gsvCents,netSales:s.sales-s.returned,risks,risk:risks.length>0,level:violation?'P1':'P2'});
 }).filter(r=>r.risk);
 return rpRankReturnRows(rows);
};


function pfReturnCauses(s,previous={returnRate:s.previousRate,receivedRate:s.previousReceivedRate}){
 const sold=Number.isFinite(s.sales)?s.sales:s.shipped;
 const netSales=Object.hasOwn(s,'netSales')?(Number.isFinite(s.netSales)?s.netSales:null):Number.isFinite(sold)&&Number.isFinite(s.returned)?sold-s.returned:null;
 const metrics={netSales,returnDelta:periodRateGrowth(s.returnRate,previous.returnRate),receivedDelta:periodRateGrowth(s.receivedRate,previous.receivedRate)};
 if(!brcResultMatch('quality-worsening',metrics))return [];
 return [brcResultKeyActive('quality-worsening','quality.worsenReturn')&&brcMatch('quality.worsenReturn',metrics.returnDelta,metrics)?'总退环比恶化':'',brcResultKeyActive('quality-worsening','quality.worsenReceived')&&brcMatch('quality.worsenReceived',metrics.receivedDelta,metrics)?'已收退环比恶化':''].filter(Boolean);
}
