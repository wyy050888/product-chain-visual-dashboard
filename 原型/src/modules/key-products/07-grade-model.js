// 图表区域和产品等级共用图片规则；空档仅在明细中保留，待业务补齐。
const kpmGradeOrder=['S','A','B','C'];
const kpmGradeRules={
 S:{salesAbove:600,profitAbove:12},
 A:{salesAbove:300,profitBelow:12},
 B:{salesAbove:60,salesBelow:300,profitAbove:15},
 C:{salesBelow:60,profitBelow:12}
};
const kpmChanges={up:'等级上升',down:'等级下降',same:'等级保持',new:'首次分级',pending:'待分级',uncompared:'上期待分级'};
const kpmGradeTransitions={up:['C-B','C-A','C-S','B-A','B-S','A-S'],down:['S-A','S-B','S-C','A-B','A-C','B-C']};
let kpmSelectedChange='all',kpmSelectedTransition='all';
function kpmTransitionKey(assessment){return assessment.previous.level+'-'+assessment.current.level}
function kpmMatchesChange(assessment,change='all',transition='all'){
 return (change==='all'||(change==='changed'?['up','down'].includes(assessment.change):assessment.change===change))
  &&(transition==='all'||(['up','down'].includes(assessment.change)&&kpmTransitionKey(assessment)===transition));
}
function kpmClassifyGrade(salesWan,profit,units=1){
 if(!(units>0)||!Number.isFinite(salesWan)||!Number.isFinite(profit))return null;
 for(const level of kpmGradeOrder){
  const r=kpmGradeRules[level];
  if((r.salesAbove===undefined||salesWan>r.salesAbove)&&(r.salesBelow===undefined||salesWan<r.salesBelow)
   &&(r.profitAbove===undefined||profit>r.profitAbove)&&(r.profitBelow===undefined||profit<r.profitBelow))return level;
 }
 return null;
}
function kpmGradeAssessment(identity,end,platform='all'){
 const start=shiftDate(end,-29),facts=upSummary(identity,start,end,platform);
 const level=kpmClassifyGrade(facts.gsvCents/1000000,facts.profitRate,facts.sales);
 return {start,end,level,gsvCents:facts.gsvCents,profitRate:facts.profitRate,sales:facts.sales,profitCents:facts.profitCents,returnRate:facts.returnRate,receivedRate:facts.receivedRate};
}
function kpmGradeChange(current,previous){
 if(!current.level)return 'pending';
 if(!previous.level)return 'uncompared';
 const diff=kpmGradeOrder.indexOf(previous.level)-kpmGradeOrder.indexOf(current.level);
 return diff>0?'up':diff<0?'down':'same';
}
function kpmGradeComparison(identity,end,platform='all'){
 const current=kpmGradeAssessment(identity,end,platform),previous=kpmGradeAssessment(identity,shiftDate(end,-30),platform);
 const change=current.level&&!previous.level&&upProduct(identity).actualLaunch>previous.end?'new':kpmGradeChange(current,previous);
 return {current,previous,change};
}
function kpmGradeHistory(identity,end,platform='all'){
 // 历史来自同一逐日台账，每条是独立的30天窗口；上架前数据不伪造等级。
 return Array.from({length:6},(_,i)=>kpmGradeComparison(identity,shiftDate(end,-30*i),platform));
}
window.dashboardKeyProductGradeHistory=spuId=>withPeriod('matrix',()=>{
 const p=upSpus.get(spuId);return p?kpmGradeHistory(p,upWindow().end,kpmBusinessPlatforms()):[];
});
