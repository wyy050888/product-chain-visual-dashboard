// 更新结论：库存只看公司，余额读最新样例快照，周转默认近30日。
function rpCompanyStockRows(){
 const previous=localPeriods.risk;
 localPeriods.risk={mode:'day',year:+DATA_CUTOFF.slice(0,4),value:+DATA_CUTOFF.slice(5,7),start:shiftDate(DATA_CUTOFF,-29),end:DATA_CUTOFF};
 try{return withPeriod('risk',()=>irLedger().map(r=>{
  const p=upIdentity(r),s=upSummary(p,shiftDate(DATA_CUTOFF,-29),DATA_CUTOFF),month=DATA_CUTOFF.slice(0,7)+'-01';
  const violation=qrPlatforms.reduce((n,platform)=>{const m=qrObservation(upProduct(p),platform,month,DATA_CUTOFF).monthly;return n+Number(m.offShelf||0)+(m.events||[]).filter(e=>e.type==='资金冻结').length},0);
  const facts={...r,...upPlatformStockFacts(r,'all'),violation:violation>=3?'红色':'正常',violationCount:violation,platformMetrics:[{platform:'全公司',profitRate:s.profitRate,returnRate:s.returnRate,receivedRate:s.receivedRate}],snapshotDate:DATA_CUTOFF};
  return {...facts,reasons:irReasons(facts)};
 }).filter(r=>r.reasons.length&&r.totalUnits>0).sort((a,b)=>b.goodsValueCents-a.goodsValueCents))}finally{if(previous)localPeriods.risk=previous;else delete localPeriods.risk}
}
const rpDecideBeforeConfirmed=sbDecide;
sbDecide=function(s){
 const base=rpDecideBeforeConfirmed(s),score=sbScoreRisk(s);
 const signals=base.signals.filter(x=>!/店铺分命中|期间品质处罚/.test(x.label));
 if(score&&s.qualityPenaltyCount>=2)signals.push({color:score,label:'店铺分异常且当月品质处罚≥2次'});
 return {signals,color:signals.some(x=>x.color==='red')?'red':signals.some(x=>x.color==='yellow')?'yellow':'green'};
};
sbReturnRisk=function(p){return rpShopProblemHit(p)};
const rpShopRulesBeforeConfirmed=sbRules;
sbRules=function(){return '店铺分异常与当月品质类处罚≥2次同时满足；当月品质罚款≥5000元（不含冻结）独立入榜。单品比较上周、本周目标总退和实际总退，两期均超过各自目标的105%且本周高于上周。店铺分按六平台阈值判色：抖音/京东≤4.6红、(4.6,4.8)黄；天猫<4.6红、[4.6,4.8)黄；快手≤4.4红、(4.4,4.7)黄；视频号≤4红、(4,4.5)黄；拼多多≤4.7红、(4.7,4.8)黄；达到黄灯上界显示正常色。品质风险按平台罚款、资金冻结、链接下架／掉权筛选。现有分值、核心主营SPU和处罚事件为演示数据。'};

// 事件按所属平台的可用类型取数；缺失类型不参与入榜、排序与金额合计。
const rpMonthlyBeforeConfirmed=qrbMonthly;
qrbMonthly=function(...args){
 const original=rpMonthlyBeforeConfirmed(...args),platform=args[1],raw=qfPreviousMonthly(...args);
 const dropped=raw.events.filter(e=>e.type==='掉权'&&e.source==='demo');
 const returnHit=qrbReturnDecision(original.current.orders,original.current.returnRate,original.target,true);
 const events=rpPlatformViolationEvents([...original.events,...dropped],platform,platform);
 const amount=type=>events.filter(e=>e.type===type).reduce((sum,e)=>sum+(Number(e.amount)||0),0);
 const fine=amount('罚款'),frozen=amount('资金冻结'),offShelf=events.filter(e=>e.type==='下架').length,dropCount=events.filter(e=>e.type==='掉权').length;
 const hits=[fine>0,frozen>0,offShelf+dropCount>0,returnHit,original.contactHit];
 const risks=['平台罚款','资金冻结','链接下架／掉权','总退超目标','进线率恶化'].filter((_,i)=>hits[i]);
 const allEvents=rpPlatformViolationEvents([...events,...qrbNonQualityEvents(args[0],platform,original.start,original.end)],platform,platform).sort((a,b)=>a.date.localeCompare(b.date));
 return {...original,supported:true,returnHit,fine,frozen,offShelf,events,allEvents,dropCount,hits,risks,penaltyHit:hits.slice(0,3).some(Boolean),priority:hits.findIndex(Boolean)};
};
sbPanel=function(s){
 const score=sbScoreRisk(s),end=bounds().cutoff,monday=shiftDate(end,-((new Date(end+'T00:00:00Z').getUTCDay()+6)%7)),previous=shiftDate(monday,-7);
 const rows=[['评分与当月品质处罚',fmt(s.score,2)+'分 / '+s.qualityPenaltyCount+'次','两者同时满足',Boolean(score&&s.qualityPenaltyCount>=2)],['当月纯品质罚款',pfMoneyYuan(s.qualityFine),'≥5000元，不含冻结',s.qualityFine>=5000],['资金冻结',pfMoneyYuan(s.frozenAmount),'按现有资金冻结规则',s.frozenAmount>0],['单品两周退货恶化',s.returnProducts.filter(sbReturnRisk).length+'个SPU','上周与本周超目标且本周更高',s.returnProducts.some(sbReturnRisk)]];
 return '<section class="sb-business"><h3>店铺品质风险依据</h3>'+table(['判定项','当前样例数据','执行条件','结果'],rows.map(([a,b,c,hit])=>[a,b,c,hit?'命中':'未命中']))+'<h4>单品退货 · 上周与本周</h4>'+table(['产品','上周实际总退','本周实际总退','两期目标','判定结果'],s.returnProducts.map(r=>[esc(r.name),upPercent(r.previous),upPercent(r.current),upPercent(r.target),sbReturnRisk(r)?'本周恶化':'未命中']))+`<p class="note">周窗口：${previous} — ${shiftDate(monday,-1)}；${monday} — ${end}。比率为原型样例，核心主营SPU按所选期间本店销量最高的SPU自动识别。</p><details><summary>业务规则</summary><p>${sbRules()}</p></details></section>`;
};


// 详情库存沿用最新公司快照、近30日周转；经营页继续使用入口日期和平台。
function pfCompanyStockModel(state){
 const range={start:shiftDate(DATA_CUTOFF,-29),end:DATA_CUTOFF,platform:'all'};
 return upWithRange(range,()=>{
  const ledger=inventoryProductLedger().find(r=>r.spuId===state.spuId);
  const stock=ledger?upPlatformStockFacts(ledger,'all'):null;
  const highStock=rpCompanyStockRows().find(r=>r.spuId===state.spuId)||null;
  return {stock,highStock,stockSummary:upSummary(upSpus.get(state.spuId),range.start,range.end,'all'),stockEnd:range.end};
 });
}
irRules=function(){return '库存仅按全公司统计，不按平台筛选。余额读取最新样例快照，周转使用近30日。总库存＝仓内＋工厂＋新机未交付；货值按含税含品牌财务价计算。总退＞55%、已收退＞30%、滞销、利润率＜10%、当月下架＋冻结≥3次任一命中即入榜。多个命中不重复计库存；当前按货值降序，排序优先级冲突待补充。批次库龄和实时业务库存台账尚未接入。'};

// 恶化榜仅按两项退货条件入榜；品质处罚保留展示及原有排序，不独立触发入榜。
rrRows=function(){
 const w=upWindow();
 return rrAll().filter(r=>rrState.platform==='all'||r.channel===rrState.platform).map(r=>{
  const m=qrObservation(upProduct(upIdentity(r)),r.channel,w.start,w.end).monthly;
  const fineEvents=m.events.filter(e=>e.type==='罚款'),fineHit=fineEvents.some(e=>Number(e.amount)>=5000),penaltyCount=m.events.length;
  const violation=m.offShelf>=2||fineHit||penaltyCount>=2;
  const returnGap=r.returnRate-m.target,receivedGap=r.receivedRate-8;
  const risks=pfReturnCauses(r,m);
  const s=upSummary(upIdentity(r),w.start,w.end,r.channel);
  return {...r,returnTarget:m.target,receivedTarget:8,returnGap,receivedGap,qualityViolation:violation,qualityFine:m.fine,gsvCents:s.gsvCents,risks,risk:risks.length>0,level:violation?'P1':'P2'};
 }).filter(r=>r.risk).sort((a,b)=>Number(b.qualityViolation)-Number(a.qualityViolation)||(b.qualityViolation?b.qualityFine-a.qualityFine:0)||b.gsvCents-a.gsvCents||b.returnGap-a.returnGap||b.receivedGap-a.receivedGap);
};


function pfReturnCauses(s,m){
 return [s.returnRate!==null&&s.returnRate>m.target+5?'总退超目标':'',s.receivedRate!==null&&s.receivedRate>10?'已收退超目标':''].filter(Boolean);
}
